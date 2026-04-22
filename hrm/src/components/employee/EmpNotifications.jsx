import { gql } from "@apollo/client";
import { useQuery, useMutation } from "@apollo/client/react";

const GET_NOTIFICATIONS = gql`
  query {
    notifications {
      id
      message
      isRead
      createdAt
    }
  }
`;

const MARK_READ = gql`
  mutation($id: ID!) {
    markNotificationRead(id: $id)
  }
`;

export default function Notifications() {
  const { data, loading, refetch } = useQuery(GET_NOTIFICATIONS, {
    fetchPolicy: "network-only",
  });

  const [markRead] = useMutation(MARK_READ);

  if (loading) return <div>Loading notifications...</div>;

  return (
    <div className="card">
      <h2>Notifications</h2>

      {data?.notifications?.length === 0 && (
        <p style={{ color: "#aaa" }}>No notifications</p>
      )}

      {data?.notifications?.map((n) => {
        const message = n.message || "";
        const isApproved = message.toLowerCase().includes("approved");
        const isRejected = message.toLowerCase().includes("rejected");

        const containerStyle = {
          padding: "10px",
          marginBottom: "8px",
          borderRadius: "8px",
          cursor: "pointer",
          border: `1px solid ${isApproved ? "#34d399" : isRejected ? "#fca5a5" : "#e5e7eb"}`,
          background: isApproved
            ? "#ecfdf5"
            : isRejected
            ? "#fef2f2"
            : n.isRead
            ? "#f5f5f5"
            : "#e8f8ef",
          color: isApproved ? "#166534" : isRejected ? "#991b1b" : "#111827",
        };

        return (
          <div
            key={n.id}
            style={containerStyle}
            onClick={async () => {
              await markRead({ variables: { id: n.id } });
              refetch();
            }}
          >
            <div>{n.message}</div>
            <small style={{ color: "#888" }}>
              {new Date(n.createdAt).toLocaleString()}
            </small>
          </div>
        );
      })}
    </div>
  );
}