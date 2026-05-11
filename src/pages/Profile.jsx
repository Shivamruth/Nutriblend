import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase/Client";
import "../styles/profile.css";

const FITNESS_LEVELS = [
  "Beginner",
  "Consistent",
  "Athlete",
  "Transformation",
  "Competition Prep",
];

const GOAL_OPTIONS = [
  "Muscle Gain",
  "Fat Loss",
  "Lean Bulk",
  "Strength",
  "Daily Protein",
  "Competition Prep",
];

const formatOrderId = (id) => {
  if (!id) return "NB-000000";

  const value = String(id);

  if (/^\d+$/.test(value)) {
    return `NB-${value.padStart(6, "0")}`;
  }

  return `NB-${value.slice(-8).toUpperCase()}`;
};

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

const formatDate = (dateValue) => {
  if (!dateValue) return "N/A";

  return new Date(dateValue).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatStatus = (status) => {
  const value = String(status || "Placed").toLowerCase();

  if (value === "placed") return "Placed";
  if (value === "preparing") return "Preparing";
  if (value === "out for delivery") return "Out for Delivery";
  if (value === "out_for_delivery") return "Out for Delivery";
  if (value === "delivered") return "Delivered";
  if (value === "cancelled") return "Cancelled";
  if (value === "canceled") return "Cancelled";

  return "Placed";
};

const getStatusClass = (status) =>
  `profile-order-status status-${String(status || "Placed")
    .toLowerCase()
    .replaceAll(" ", "-")}`;

const getOrderItems = (order) => {
  if (Array.isArray(order.items) && order.items.length > 0) return order.items;

  return [
    {
      id: order.id,
      name: order.product_name || "NutriBlend Order",
      price: order.price || order.total || 0,
      qty: order.qty || 1,
      isPlan: false,
    },
  ];
};

const getItemName = (item) =>
  item.name || item.product_name || "NutriBlend Item";

const getInitials = (name, email) => {
  if (name) {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  if (email) return email[0].toUpperCase();

  return "U";
};

const getFitnessRank = (ordersCount, deliveredCount, totalSpent) => {
  if (deliveredCount >= 25 || totalSpent >= 15000) return "Elite Fueler";
  if (deliveredCount >= 12 || totalSpent >= 7000) return "Pro Member";
  if (deliveredCount >= 5 || ordersCount >= 7) return "Consistent Member";
  if (ordersCount >= 1) return "Started Journey";

  return "New Member";
};

export default function Profile({ setPage }) {
  const [profile, setProfile] = useState(null);
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    address: "",
    fitness_goal: "",
    fitness_level: "",
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
          fitness_goal: profileData.fitness_goal || "",
          fitness_level: profileData.fitness_level || "",
        });
      }

      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: false });

      if (ordersError) {
        console.error("Orders error:", ordersError.message);
      } else {
        setOrders(ordersData || []);
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

  const stats = useMemo(() => {
    const delivered = orders.filter(
      (order) => formatStatus(order.status) === "Delivered"
    ).length;

    const cancelled = orders.filter(
      (order) => formatStatus(order.status) === "Cancelled"
    ).length;

    const active = orders.filter((order) =>
      ["Placed", "Preparing", "Out for Delivery"].includes(
        formatStatus(order.status)
      )
    ).length;

    const totalSpent = orders.reduce(
      (sum, order) => sum + Number(order.total || order.price || 0),
      0
    );

    const proteinItems = orders.reduce((sum, order) => {
      return (
        sum +
        getOrderItems(order).reduce(
          (itemSum, item) => itemSum + Number(item.qty || 1),
          0
        )
      );
    }, 0);

    return {
      total: orders.length,
      delivered,
      cancelled,
      active,
      totalSpent,
      proteinItems,
      rank: getFitnessRank(orders.length, delivered, totalSpent),
    };
  }, [orders]);

  const recentOrders = useMemo(() => orders.slice(0, 3), [orders]);

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "N/A";

  const initials = getInitials(profile?.full_name, user?.email);

  const completionItems = [
    Boolean(profile?.full_name),
    Boolean(profile?.phone),
    Boolean(profile?.address || selectedAddress),
    Boolean(profile?.fitness_goal),
    Boolean(profile?.fitness_level),
  ];

  const completionPercent = Math.round(
    (completionItems.filter(Boolean).length / completionItems.length) * 100
  );

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
      const payload = {
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        fitness_goal: form.fitness_goal,
        fitness_level: form.fitness_level,
      };

      const { data, error } = await supabase
        .from("profiles")
        .update(payload)
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
      full_name: profile?.full_name || "",
      phone: profile?.phone || "",
      address: profile?.address || "",
      fitness_goal: profile?.fitness_goal || "",
      fitness_level: profile?.fitness_level || "",
    });

    setEditing(false);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    if (setPage) setPage("home");
  };

  if (loading || !profile) {
    return (
      <div className="profile-page">
        <div className="profile-hero-card">
          <div className="profile-loading-avatar loading" />
          <div className="home-skeleton-text loading" />
          <div className="home-skeleton-text-sm loading" />
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <section className="profile-hero-card">
        <div className="profile-hero-glow" />

        <div className="profile-hero-main">
          <div className="profile-avatar-wrap">
            <div className="profile-avatar">
              <span>{initials}</span>
            </div>

            <div className="profile-level-ring">
              <span>{completionPercent}%</span>
            </div>
          </div>

          <div className="profile-identity">
            <p className="profile-eyebrow">NutriBlend Fitness Profile</p>
            <h2 className="profile-name">{profile.full_name || "Gym Member"}</h2>

            <div className="profile-chips">
              <span>
                {profile.role === "admin" ? "🛡️ Admin" : "🏋️ Customer"}
              </span>
              <span>🔥 {stats.rank}</span>
              <span>📅 Since {memberSince}</span>
            </div>

            <p className="profile-motivation">
              Track your protein orders, keep your delivery details ready, and
              stay consistent with your fitness fuel.
            </p>
          </div>
        </div>

        <div className="profile-quick-actions">
          <button onClick={() => setPage?.("orders")}>View Orders</button>
          <button onClick={() => setPage?.("address")}>Manage Address</button>
          <button onClick={() => setPage?.("home")}>Shop Protein</button>
          <button className="profile-logout-btn" onClick={logout}>
            Logout
          </button>
        </div>
      </section>

      <div className="profile-stats">
        <StatCard icon="📦" value={stats.total} label="Total Orders" />
        <StatCard icon="⏳" value={stats.active} label="Active Orders" />
        <StatCard icon="✅" value={stats.delivered} label="Delivered" />
        <StatCard icon="🥤" value={stats.proteinItems} label="Items Ordered" />
        <StatCard icon="💰" value={money(stats.totalSpent)} label="Total Spent" />
      </div>

      <div className="profile-grid">
        <div className="profile-card">
          <div className="profile-section-head">
            <div>
              <p className="profile-card-eyebrow">Account</p>
              <h3 className="profile-section-title">Personal Details</h3>
            </div>

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
              <DetailItem icon="📧" label="Email" value={profile.email || user?.email || "Not set"} />
              <DetailItem icon="📱" label="Phone" value={profile.phone || "Not set"} />
              <DetailItem icon="🏠" label="Basic Address" value={profile.address || "Not set"} />
              <DetailItem icon="🎯" label="Fitness Goal" value={profile.fitness_goal || "Not set"} />
              <DetailItem icon="🏆" label="Fitness Level" value={profile.fitness_level || "Not set"} />
              <DetailItem icon="⭐" label="Account Role" value={profile.role || "customer"} />
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
                Fitness Goal
                <select
                  name="fitness_goal"
                  value={form.fitness_goal}
                  onChange={handleChange}
                >
                  <option value="">Select your fitness goal</option>
                  {GOAL_OPTIONS.map((goal) => (
                    <option key={goal} value={goal}>
                      {goal}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Fitness Level
                <select
                  name="fitness_level"
                  value={form.fitness_level}
                  onChange={handleChange}
                >
                  <option value="">Select your fitness level</option>
                  {FITNESS_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
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

        <div className="profile-side-stack">
          <div className="profile-card profile-progress-card">
            <div className="profile-section-head compact">
              <div>
                <p className="profile-card-eyebrow">Progress</p>
                <h3 className="profile-section-title">Profile Strength</h3>
              </div>
            </div>

            <div className="profile-progress-circle">
              <span>{completionPercent}%</span>
              <p>Complete</p>
            </div>

            <div className="profile-progress-bar">
              <span style={{ width: `${completionPercent}%` }} />
            </div>

            <p className="profile-progress-note">
              Complete your fitness goal and address details for a smoother
              checkout experience.
            </p>
          </div>

          <div className="profile-card">
            <div className="profile-section-head compact">
              <div>
                <p className="profile-card-eyebrow">Delivery</p>
                <h3 className="profile-section-title">Selected Address</h3>
              </div>
            </div>

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

                <button
                  className="profile-small-action"
                  onClick={() => setPage?.("address")}
                >
                  Manage Addresses
                </button>
              </div>
            ) : (
              <div className="profile-address-empty">
                <span>📭</span>
                <p>No selected address found.</p>
                <button onClick={() => setPage?.("address")}>Add Address</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="profile-grid bottom-grid">
        <div className="profile-card">
          <div className="profile-section-head compact">
            <div>
              <p className="profile-card-eyebrow">Orders</p>
              <h3 className="profile-section-title">Recent Fuel Orders</h3>
            </div>

            <button className="profile-edit-btn" onClick={() => setPage?.("orders")}>
              View All
            </button>
          </div>

          {recentOrders.length === 0 ? (
            <div className="profile-empty-orders">
              <span>🥤</span>
              <p>No orders yet. Start your fitness fuel journey.</p>
              <button onClick={() => setPage?.("home")}>Shop Now</button>
            </div>
          ) : (
            <div className="profile-recent-orders">
              {recentOrders.map((order) => {
                const firstItem = getOrderItems(order)[0];

                return (
                  <div className="profile-order-row" key={order.id}>
                    <div>
                      <strong>{formatOrderId(order.id)}</strong>
                      <p>
                        {getItemName(firstItem)} • {formatDate(order.created_at)}
                      </p>
                    </div>

                    <div className="profile-order-right">
                      <span className={getStatusClass(order.status)}>
                        {formatStatus(order.status)}
                      </span>
                      <b>{money(order.total || order.price)}</b>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="profile-card profile-tips-card">
          <div className="profile-section-head compact">
            <div>
              <p className="profile-card-eyebrow">Fitness Fuel</p>
              <h3 className="profile-section-title">Quick Summary</h3>
            </div>
          </div>

          <div className="profile-summary-list">
            <div>
              <span>🥤</span>
              <p>
                You have ordered <strong>{stats.proteinItems}</strong> protein
                item{stats.proteinItems !== 1 ? "s" : ""}.
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
                Goal:{" "}
                <strong>{profile.fitness_goal || "Set your fitness goal"}</strong>
              </p>
            </div>

            <div>
              <span>🔥</span>
              <p>
                Rank: <strong>{stats.rank}</strong>. Stay consistent with daily
                protein intake.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, value, label }) {
  return (
    <div className="profile-stat-card">
      <span>{icon}</span>
      <h3>{value}</h3>
      <p>{label}</p>
    </div>
  );
}

function DetailItem({ icon, label, value }) {
  return (
    <div className="profile-detail-item">
      <div className="profile-detail-icon">{icon}</div>

      <div>
        <span className="profile-detail-label">{label}</span>
        <span className="profile-detail-value">{value}</span>
      </div>
    </div>
  );
}
