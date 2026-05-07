import { useEffect, useState } from "react";
import { supabase } from "../supabase/Client";
import "../styles/profile.css";

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [user, setUser] = useState(null);
  const [ordersCount, setOrdersCount] = useState(0);
  const [deliveredCount, setDeliveredCount] = useState(0);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    address: "",
  });

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    setLoading(true);

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData.user) {
        console.error("User error:", userError?.message);
        setLoading(false);
        return;
      }

      setUser(userData.user);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userData.user.id)
        .single();

      if (profileError) {
        console.error("Profile error:", profileError.message);
      } else {
        setProfile(profileData);

        setForm({
          full_name: profileData.full_name || "",
          phone: profileData.phone || "",
          address: profileData.address || "",
        });
      }

      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("id, status")
        .eq("user_id", userData.user.id);

      if (ordersError) {
        console.error("Orders error:", ordersError.message);
      } else {
        const orders = ordersData || [];
        setOrdersCount(orders.length);
        setDeliveredCount(
          orders.filter((order) => order.status === "Delivered").length
        );
      }

      const addresses = JSON.parse(localStorage.getItem("addresses")) || [];
      const selected = JSON.parse(localStorage.getItem("selectedAddress"));

      setSavedAddresses(addresses);
      setSelectedAddress(selected);
    } catch (error) {
      console.error("Profile page error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const saveProfile = async (e) => {
    e.preventDefault();

    if (!user) return;

    if (!form.full_name.trim()) {
      alert("Full name is required");
      return;
    }

    if (form.phone && !/^[6-9]\d{9}$/.test(form.phone)) {
      alert("Enter a valid 10-digit Indian phone number");
      return;
    }

    setSaving(true);

    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
        })
        .eq("id", user.id)
        .select("*")
        .single();

      if (error) {
        console.error("Profile update error:", error.message);
        alert(error.message || "Failed to update profile");
        return;
      }

      setProfile(data);
      setEditing(false);
      alert("Profile updated successfully ✅");
    } catch (error) {
      console.error("Save profile error:", error);
      alert("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setForm({
      full_name: profile.full_name || "",
      phone: profile.phone || "",
      address: profile.address || "",
    });

    setEditing(false);
  };

  if (loading || !profile) {
    return (
      <div className="profile-page">
        <div className="profile-card">
          <div className="profile-loading-avatar loading" />
          <div className="home-skeleton-text loading" />
          <div className="home-skeleton-text-sm loading" />
        </div>
      </div>
    );
  }

  const initials = profile.full_name
    ? profile.full_name
        .split(" ")
        .map((name) => name[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "N/A";

  return (
    <div className="profile-page">
      <div className="profile-hero-card">
        <div className="profile-avatar-section">
          <div className="profile-avatar">
            <span>{initials}</span>
          </div>

          <p className="profile-eyebrow">NutriBlend Account</p>
          <h2 className="profile-name">{profile.full_name || "User"}</h2>

          <p className="profile-role">
            {profile.role === "admin" ? "🛡️ Admin" : "🏋️ Member"}
          </p>
        </div>

        <div className="profile-stats">
          <div className="profile-stat-card">
            <span>📦</span>
            <h3>{ordersCount}</h3>
            <p>Total Orders</p>
          </div>

          <div className="profile-stat-card">
            <span>✅</span>
            <h3>{deliveredCount}</h3>
            <p>Delivered</p>
          </div>

          <div className="profile-stat-card">
            <span>📍</span>
            <h3>{savedAddresses.length}</h3>
            <p>Addresses</p>
          </div>
        </div>
      </div>

      <div className="profile-grid">
        <div className="profile-card">
          <div className="profile-section-head">
            <h3 className="profile-section-title">Personal Details</h3>

            {!editing && (
              <button
                className="profile-edit-btn"
                onClick={() => setEditing(true)}
              >
                Edit Profile
              </button>
            )}
          </div>

          {!editing ? (
            <div className="profile-details">
              <div className="profile-detail-item">
                <div className="profile-detail-icon">📧</div>
                <div>
                  <span className="profile-detail-label">Email</span>
                  <span className="profile-detail-value">
                    {profile.email || user?.email || "Not set"}
                  </span>
                </div>
              </div>

              <div className="profile-detail-item">
                <div className="profile-detail-icon">📱</div>
                <div>
                  <span className="profile-detail-label">Phone</span>
                  <span className="profile-detail-value">
                    {profile.phone || "Not set"}
                  </span>
                </div>
              </div>

              <div className="profile-detail-item">
                <div className="profile-detail-icon">🏠</div>
                <div>
                  <span className="profile-detail-label">Basic Address</span>
                  <span className="profile-detail-value">
                    {profile.address || "Not set"}
                  </span>
                </div>
              </div>

              <div className="profile-detail-item">
                <div className="profile-detail-icon">📅</div>
                <div>
                  <span className="profile-detail-label">Member Since</span>
                  <span className="profile-detail-value">{memberSince}</span>
                </div>
              </div>

              <div className="profile-detail-item">
                <div className="profile-detail-icon">⭐</div>
                <div>
                  <span className="profile-detail-label">Account Role</span>
                  <span className="profile-detail-value">
                    {profile.role || "customer"}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <form className="profile-edit-form" onSubmit={saveProfile}>
              <label>
                Full Name
                <input
                  name="full_name"
                  value={form.full_name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  required
                />
              </label>

              <label>
                Phone Number
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="Enter phone number"
                  maxLength="10"
                />
              </label>

              <label>
                Basic Address
                <textarea
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="Enter basic address"
                  rows="3"
                />
              </label>

              <div className="profile-edit-actions">
                <button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </button>

                <button
                  type="button"
                  className="profile-cancel-btn"
                  onClick={cancelEdit}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="profile-card">
          <h3 className="profile-section-title">Delivery Address</h3>

          {selectedAddress ? (
            <div className="profile-address-box">
              <div className="profile-address-head">
                <span>📍</span>
                <div>
                  <h4>
                    {selectedAddress.name}{" "}
                    {selectedAddress.type ? `• ${selectedAddress.type}` : ""}
                  </h4>
                  <p>{selectedAddress.phone}</p>
                </div>
              </div>

              <p className="profile-address-text">
                {selectedAddress.street}, {selectedAddress.city},{" "}
                {selectedAddress.state} - {selectedAddress.pincode}
              </p>

              {selectedAddress.isDefault && (
                <span className="profile-default-chip">Default Address</span>
              )}
            </div>
          ) : (
            <div className="profile-address-empty">
              <span>📭</span>
              <p>No selected address found.</p>
            </div>
          )}
        </div>
      </div>

      <div className="profile-card profile-tips-card">
        <h3 className="profile-section-title">Quick Summary</h3>

        <div className="profile-summary-list">
          <div>
            <span>🥤</span>
            <p>
              You have placed <strong>{ordersCount}</strong> order
              {ordersCount !== 1 ? "s" : ""} with NutriBlend.
            </p>
          </div>

          <div>
            <span>📍</span>
            <p>
              You have saved <strong>{savedAddresses.length}</strong> delivery
              address{savedAddresses.length !== 1 ? "es" : ""}.
            </p>
          </div>

          <div>
            <span>💪</span>
            <p>
              Keep your protein intake consistent with daily or monthly shake
              plans.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}