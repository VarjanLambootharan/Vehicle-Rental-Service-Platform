"""Exercise the packaged server using disposable storage and generated credentials.
Run from any directory: python backend/scripts/smoke_test.py
JAVA_HOME must point to JDK 21. Build backend/target/vehicle-rental-1.0.0.jar first.
"""
import base64
import datetime as dt
import text_format
import os
from pathlib import Path
import re
import secrets
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
import uuid

BACKEND = Path(__file__).resolve().parents[1]
JAR = BACKEND / 'target' / 'vehicle-rental-1.0.0.jar'
JAVA = str(Path(os.environ['JAVA_HOME']) / 'bin' / ('java.exe' if os.name == 'nt' else 'java'))


def main():
    assert JAR.exists(), 'Run Maven package first'
    with tempfile.TemporaryDirectory(prefix='vehicle-rental-smoke-') as temporary:
        folder = Path(temporary)
        storage = folder / 'runtime'
        env = dict(os.environ, APP_STORAGE_PATH=str(storage), ADMIN_EMAIL='admin@example.com',
                   ADMIN_PASSWORD=secrets.token_urlsafe(24), TOKEN_SECRET=base64.b64encode(secrets.token_bytes(32)).decode(),
                   SERVER_PORT='0', APP_BUSINESS_TIMEZONE='Asia/Colombo')
        process = None
        log = None
        port = None
        # Never use an environment-configured proxy for local smoke requests.
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))

        def call(method, path, body=None, token=None, expected=200):
            payload = None if body is None else text_format.dumps(body).encode()
            headers = {'Content-Type': 'text/plain'}
            if token:
                headers['Authorization'] = 'Bearer ' + token
            req = urllib.request.Request(f'http://127.0.0.1:{port}/api/v1{path}', data=payload, headers=headers, method=method)
            try:
                response = opener.open(req, timeout=10)
            except urllib.error.HTTPError as failure:
                response = failure
            with response:
                raw = response.read()
                assert response.status == expected, f'{method} {path}: expected {expected}, got {response.status}'
                return text_format.loads(raw) if raw else None

        def stop():
            nonlocal process, log
            if process is not None:
                process.terminate()
                try:
                    process.wait(timeout=20)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait(timeout=10)
                process = None
            if log is not None:
                log.close()
                log = None

        def start(index):
            nonlocal process, log, port
            log_path = folder / f'server-{index}.log'
            log = log_path.open('wb')
            process = subprocess.Popen([JAVA, '-jar', str(JAR)], cwd=BACKEND, env=env,
                                       stdout=log, stderr=subprocess.STDOUT,
                                       creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
            deadline = time.monotonic() + 60
            while time.monotonic() < deadline:
                assert process.poll() is None, f'Server exited; inspect {log_path}'
                content = log_path.read_text(encoding='utf-8', errors='replace')
                match = re.search(r'Tomcat started on port (\d+)', content)
                if match and 'Started VehicleRentalApplication' in content:
                    port = int(match.group(1))
                    try:
                        call('POST', '/auth/login', {'email': env['ADMIN_EMAIL'], 'password': env['ADMIN_PASSWORD']})
                        return
                    except (AssertionError, OSError):
                        pass
                time.sleep(0.2)
            raise AssertionError('Server startup timed out')

        try:
            start(1)
            admin = call('POST', '/auth/login', {'email': env['ADMIN_EMAIL'], 'password': env['ADMIN_PASSWORD']})['accessToken']
            user = call('POST', '/auth/register', {'fullName': 'Smoke Customer', 'email': 'smoke@example.com',
                        'password': secrets.token_urlsafe(24), 'phone': '0771234567'}, expected=201)
            token = user['accessToken']
            vehicle = call('POST', '/vehicles', {'type': 'CAR', 'registrationNumber': 'SMOKE-001', 'brand': 'Toyota',
                           'model': 'Aqua', 'dailyRate': 7500, 'description': 'Disposable smoke vehicle',
                           'seats': 5, 'transmission': 'AUTOMATIC'}, admin, 201)
            today = dt.datetime.now(dt.timezone(dt.timedelta(hours=5, minutes=30))).date()

            def book(offset):
                return call('POST', '/bookings', {'vehicleId': vehicle['id'], 'pickupDate': str(today + dt.timedelta(days=offset)),
                            'returnDate': str(today + dt.timedelta(days=offset + 2))}, token, 201)

            first = book(2)
            paid = call('POST', '/payments', {'bookingId': first['id'], 'paymentMethod': 'MOCK_ONLINE'}, token, 201)
            assert paid['amount'] == 15000 and paid['status'] == 'PAID'
            assert call('DELETE', '/bookings/' + first['id'], token=token)['status'] == 'CANCELLED'
            assert call('GET', '/payments/' + paid['id'], token=token)['status'] == 'REFUNDED'
            pending = book(5)
            pending_paid = call('POST', '/payments', {'bookingId': pending['id'], 'paymentMethod': 'MOCK_ONLINE'}, token, 201)
            call('DELETE', '/notifications', token=token, expected=204)
            dismissed_ids = {n['id'] for n in text_format.loads((storage / 'notifications.txt').read_text())}
            stop()
            # Reproduce the exact durable state after stage 1 and before a crash.
            bookings_path = storage / 'bookings.txt'
            records = text_format.loads(bookings_path.read_text(encoding='utf-8'))
            workflow = str(uuid.uuid4())
            for record in records:
                if record['id'] == pending['id']:
                    record['status'] = 'CANCELLATION_PENDING'
                    record['cancellationWorkflow'] = {
                        'workflowId': workflow, 'bookingId': pending['id'], 'originalPaymentId': pending_paid['id'],
                        'requiredPaymentAction': 'REFUND', 'originalPaymentAmount': pending_paid['amount'],
                        'requestedAt': dt.datetime.now(dt.timezone.utc).isoformat(), 'state': 'REQUESTED'}
            bookings_path.write_text(text_format.dumps(records), encoding='utf-8')
            start(2)
            deadline = time.monotonic() + 10
            while call('GET', '/bookings/' + pending['id'], token=token)['status'] != 'CANCELLED':
                assert time.monotonic() < deadline, 'Startup recovery did not finalize cancellation'
                time.sleep(0.1)
            recovered = call('GET', '/payments/' + pending_paid['id'], token=token)
            assert recovered['status'] == 'REFUNDED'
            assert recovered['simulatedRefundReference'] == 'SIM-' + workflow
            visible = call('GET', '/notifications', token=token)
            assert len(visible) == 1 and visible[0]['notificationType'] == 'BOOKING_CANCELLED'
            assert not (dismissed_ids & {n['id'] for n in visible})
            call('DELETE', '/notifications', token=token, expected=204)
            stop()
            start(3)
            assert call('GET', '/notifications', token=token) == []
            again = call('GET', '/payments/' + pending_paid['id'], token=token)
            assert again['refundedAt'] == recovered['refundedAt']
            assert len(list(storage.glob('*.txt'))) == 7
            assert call('GET', '/bookings/' + first['id'], token=token)['status'] == 'CANCELLED'
            print('PASS: executable JAR, embedded server, admin login, customer registration, booking, payment, cancellation, refund, two restarts, startup recovery, persistent dismissal, seven plain-text files')
        finally:
            stop()


if __name__ == '__main__':
    main()
