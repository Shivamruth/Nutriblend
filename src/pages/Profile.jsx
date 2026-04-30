import { useEffect, useState } from "react";
import { supabase } from "../supabase/Client";

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: userData } = await supabase.auth.getUser();
    setUser(userData.user);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userData.user.id)
      .single();
    setProfile(data);
  };

  if (!profile) {
    return (
      <div className="profile-page">
        <div className="profile-card">
          <p className="text-muted text-center">Loading profile...</p>
        </div>
      </div>
    );
  }

  const initials = profile.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <div className="profile-page">
      <div className="profile-card">
        <div className="profile-avatar-section">
          <div className="profile-avatar"><span>{initials}</span></div>
          <h2 className="profile-name">{profile.full_name}</h2>
          <p className="profile-role">{profile.role === "admin" ? "🛡️ Admin" : "🏋️ Member"}</p>
        </div>
        <div className="profile-details">
          <div className="profile-detail-item">
            <div className="profile-detail-icon">📧</div>
            <div>
              <span className="profile-detail-label">Email</span>
              <span className="profile-detail-value">{profile.email}</span>
            </div>
          </div>
          <div className="profile-detail-item">
            <div className="profile-detail-icon">📱</div>
            <div>
              <span className="profile-detail-label">Phone</span>
              <span className="profile-detail-value">{profile.phone || "Not set"}</span>
            </div>
          </div>
          <div className="profile-detail-item">
            <div className="profile-detail-icon">📍</div>
            <div>
              <span className="profile-detail-label">Address</span>
              <span className="profile-detail-value">{profile.address || "Not set"}</span>
            </div>
          </div>
          {user && (
            <div className="profile-detail-item">
              <div className="profile-detail-icon">📅</div>
              <div>
                <span className="profile-detail-label">Member Since</span>
                <span className="profile-detail-value">
                  {new Date(user.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}