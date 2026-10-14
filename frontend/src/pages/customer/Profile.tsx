import { Link, useNavigate } from "react-router-dom";
import { customersApi } from "../../api/services";
import { useResource } from "../../hooks/useResource";
import { useAuth } from "../../contexts/AuthContext";
import {
  Badge,
  Details,
  Field,
  Form,
  PageHeader,
  ResourceView,
  Submit,
  useFeedback,
  value,
} from "../../components/common/UI";
import { date } from "../../utils/format";
export default function Profile({ edit = false }: { edit?: boolean }) {
  const resource = useResource(customersApi.me),
    auth = useAuth(),
    navigate = useNavigate(),
    feedback = useFeedback();
  return (
    <>
      <PageHeader
        eyebrow="Customer management"
        title={edit ? "Edit profile" : "My profile"}
        description="Keep your contact details ready for the next journey."
        action={
          <Link
            className="btn secondary"
            to={edit ? "/profile" : "/profile/edit"}
          >
            {edit ? "View profile" : "Edit profile"}
          </Link>
        }
      />
      <ResourceView resource={resource}>
        {(user) =>
          edit ? (
            <>
              <Form
                key={user.updatedAt}
                onSave={async (f) => {
                  await customersApi.update({
                    fullName: value(f, "fullName"),
                    email: value(f, "email"),
                    phone: value(f, "phone"),
                  });
                  await auth.refresh();
                  feedback.toast("Your profile has been updated.");
                  navigate("/profile");
                }}
              >
                {(busy) => (
                  <>
                    <Field
                      label="Full name"
                      name="fullName"
                      autoComplete="name"
                      required
                      maxLength={100}
                      defaultValue={user.fullName}
                    />
                    <Field
                      label="Email address"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      maxLength={254}
                      defaultValue={user.email}
                    />
                    <Field
                      label="Phone number"
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      required
                      pattern="[+0-9 ()\-]{7,25}"
                      minLength={7}
                      maxLength={25}
                      defaultValue={user.phone}
                    />
                    <div className="full">
                      <Submit busy={busy} />
                    </div>
                  </>
                )}
              </Form>
              <section className="panel section-gap">
                <h2>Close this chapter</h2>
                <p>
                  Deactivate your account when you no longer need it. An
                  administrator can reactivate it later. Resolve active or
                  upcoming bookings first.
                </p>
                <button
                  className="btn danger secondary"
                  onClick={() =>
                    feedback.confirm({
                      title: "Deactivate your account?",
                      message:
                        "You will be signed out and will no longer be able to sign in until an administrator reactivates your account. Your rental history is retained.",
                      action: "Deactivate account",
                      run: async () => {
                        await customersApi.deactivate();
                        auth.logout();
                        navigate("/login", { replace: true });
                        feedback.toast("Your account has been deactivated.");
                      },
                    })
                  }
                >
                  Deactivate my account
                </button>
              </section>
            </>
          ) : (
            <section className="panel profile-panel">
              <div className="avatar">{user.fullName.slice(0, 1)}</div>
              <h2>{user.fullName}</h2>
              <Badge value={user.active ? "ACTIVE" : "INACTIVE"} />
              <Details
                items={[
                  ["Email address", user.email],
                  ["Phone number", user.phone],
                  ["Account type", "Customer"],
                  ["Member since", date(user.createdAt)],
                  ["Last updated", date(user.updatedAt)],
                  ["Account reference", user.id],
                ]}
              />
            </section>
          )
        }
      </ResourceView>
    </>
  );
}
