"""Traveler's plain-text format for offline verification and packaged-server tests."""
from decimal import Decimal
import re

HEADER = 'TRAVELER-TEXT-1'


def escape(value):
    return value.replace('\\', '\\\\').replace('\t', '\\t').replace('\r', '\\r').replace('\n', '\\n')


def unescape(value):
    result, i = [], 0
    while i < len(value):
        c = value[i]
        if c in '\t\r':
            raise ValueError('Unescaped separator')
        if c == '\\':
            i += 1
            if i == len(value) or value[i] not in '\\tnr':
                raise ValueError('Invalid escape')
            c = {'\\': '\\', 't': '\t', 'n': '\n', 'r': '\r'}[value[i]]
        result.append(c)
        i += 1
    return ''.join(result)


def dumps(value):
    lines = [HEADER]

    def write(item, depth=0):
        if depth > 32:
            raise ValueError('Nesting limit')
        if item is None:
            lines.append('null')
        elif isinstance(item, bool):
            lines.append('boolean\t' + str(item).lower())
        elif isinstance(item, str):
            lines.append('string\t' + escape(item))
        elif isinstance(item, (int, float, Decimal)):
            if not re.fullmatch(r'-?(0|[1-9][0-9]*)(\.[0-9]+)?([eE][+-]?[0-9]+)?', str(item)):
                raise ValueError('Invalid decimal')
            lines.append('number\t' + str(item))
        elif isinstance(item, list):
            lines.append('list\t' + str(len(item)))
            for child in item:
                write(child, depth + 1)
        elif isinstance(item, dict):
            lines.append('object\t' + str(len(item)))
            for key, child in item.items():
                lines.append('key\t' + escape(key))
                write(child, depth + 1)
        else:
            raise ValueError('Unsupported value')

    write(value)
    return '\n'.join(lines) + '\n'


def loads(text):
    if isinstance(text, bytes):
        text = text.decode('utf-8')
    lines = text.replace('\r\n', '\n').split('\n')
    if lines[-1] == '':
        lines.pop()
    if not lines or lines.pop(0) != HEADER:
        raise ValueError('Invalid header')
    index = 0

    def next_line():
        nonlocal index
        if index == len(lines):
            raise ValueError('Truncated document')
        line = lines[index]
        index += 1
        return line

    def read(depth=0):
        if depth > 32:
            raise ValueError('Nesting limit')
        line = next_line()
        if line == 'null':
            return None
        tag, value = line.split('\t', 1)
        if tag == 'string':
            return unescape(value)
        if tag == 'boolean' and value in ('true', 'false'):
            return value == 'true'
        if tag == 'number' and re.fullmatch(r'-?(0|[1-9][0-9]*)(\.[0-9]+)?([eE][+-]?[0-9]+)?', value):
            return Decimal(value)
        if tag not in ('list', 'object') or not re.fullmatch(r'0|[1-9][0-9]*', value) or int(value) > 1_000_000:
            raise ValueError('Invalid tag or count')
        if tag == 'list':
            return [read(depth + 1) for _ in range(int(value))]
        result = {}
        for _ in range(int(value)):
            key_line = next_line()
            if not key_line.startswith('key\t'):
                raise ValueError('Missing field name')
            key = unescape(key_line[4:])
            if key in result:
                raise ValueError('Duplicate field')
            result[key] = read(depth + 1)
        return result

    result = read()
    if index != len(lines):
        raise ValueError('Trailing text')
    return result
