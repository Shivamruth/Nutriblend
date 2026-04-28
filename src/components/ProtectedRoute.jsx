import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, requireAdmin }) {
  const { user, role } = useAuth();

  if (!user) return <p>Please login</p>;

  if (requireAdmin && role !== "admin") {
    return <p>Access Denied</p>;
  }

  return children;
}