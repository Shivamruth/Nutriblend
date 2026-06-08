import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  ChevronRight,
  CreditCard,
  Gift,
  Headphones,
  HelpCircle,
  LogOut,
  MapPin,
  PackageCheck,
  Percent,
  ShieldCheck,
  Truck,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { supabase } from "../supabase/Client";
import { useNotification } from "../context/NotificationContext";
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

const getInitials = (name, email) => {
  if (name) {
    return name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  if (email) return email[0].toUpperCase();

  return "NB";
};

export default function Profile({ setPage }) {
  const { notify } = useNotification();
  const [profile, setProfile] = useState(null);
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
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

      const { data: ordersData } = await supabase
        .from("orders")
        .select("id,status,total,price")
        .eq("user_id", userData.user.id);

      const { data: addressData } = await supabase
        .from("addresses")
        .select("id")
        .eq("user_id", userData.user.id);

      setOrders(ordersData || []);
      setAddresses(addressData || []);
    } catch (error) {
      console.error("Profile page error:", error);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const delivered = orders.filter(
      (order) => String(order.status || "").toLowerCase() === "delivered"
    ).length;

    const totalSpent = orders.reduce(
      (sum, order) => sum + Number(order.total || order.price || 0),
      0
    );

    return {
      orders: orders.length,
      delivered,
      addresses: addresses.length,
      totalSpent,
    };
  }, [addresses.length, orders]);

  const initials = getInitials(profile?.full_name, user?.email);
  const email = profile?.email || user?.email || "Email not set";
  const phone = profile?.phone || "Phone not set";

  const accountRows = [
    {
      label: "Orders and Refunds",
      sub: `${stats.orders} order${stats.orders !== 1 ? "s" : ""}, ${stats.delivered} delivered`,
      icon: PackageCheck,
      action: () => setPage?.("orders"),
    },
    {
      label: "Customer Care",
      sub: "Need help with orders, payments, or delivery?",
      icon: Headphones,
      action: () => setPage?.("customer-care"),
    },
    {
      label: "Invite Friends & Earn",
      sub: "Share NutriBlend with your gym friends",
      icon: UserPlus,
      action: () => setPage?.("invite-friends"),
    },
    {
      label: "NutriBlend Wallet",
      sub: "Manage refunds, rewards, and store credits",
      icon: Wallet,
      action: () => setPage?.("wallet"),
      separated: true,
    },
    {
      label: "Saved Cards",
      sub: "Payment cards and checkout preferences",
      icon: CreditCard,
      action: () => setPage?.("saved-cards"),
    },
    {
      label: "My Rewards",
      sub: `Lifetime spend: Rs. ${stats.totalSpent.toLocaleString("en-IN")}`,
      icon: Gift,
      action: () => setPage?.("rewards"),
    },
    {
      label: "Address",
      sub: `${stats.addresses} saved delivery address${stats.addresses !== 1 ? "es" : ""}`,
      icon: MapPin,
      action: () => setPage?.("address"),
    },
    {
      label: "Notifications",
      sub: "Order updates and NutriBlend alerts",
      icon: Bell,
      action: () => setPage?.("notifications"),
    },
    {
      label: "Return Creation Demo",
      icon: PackageCheck,
      action: () => setPage?.("return-demo"),
      separated: true,
    },
    {
      label: "How To Return",
      icon: HelpCircle,
      action: () => setPage?.("how-to-return"),
    },
    {
      label: "How Do I Redeem My Coupon?",
      icon: Percent,
      action: () => setPage?.("coupon"),
    },
    {
      label: "Terms & Conditions",
      icon: ShieldCheck,
      action: () => setPage?.("terms"),
    },
    {
      label: "Promotions Terms & Conditions",
      icon: Percent,
      action: () => setPage?.("promotion-terms"),
    },
    {
      label: "Returns & Refunds Policy",
      icon: PackageCheck,
      action: () => setPage?.("refund-policy"),
    },
    {
      label: "We Respect Your Privacy",
      icon: ShieldCheck,
      action: () => setPage?.("privacy"),
    },
    {
      label: "Fees & Payments",
      icon: CreditCard,
      action: () => setPage?.("fees-payments"),
    },
    {
      label: "Delivery and Shipping Policy",
      icon: Truck,
      action: () => setPage?.("shipping"),
    },
    {
      label: "Who We Are",
      icon: Users,
      action: () => setPage?.("who-we-are"),
    },
    {
      label: "Join Our Team",
      icon: UserPlus,
      action: () => setPage?.("careers"),
    },
  ];

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
      notify("Full name is required", "error");
      return;
    }

    if (form.phone && !/^[6-9]\d{9}$/.test(form.phone)) {
      notify("Enter a valid 10-digit Indian phone number", "error");
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
        notify(error.message || "Failed to update profile", "error");
        return;
      }

      setProfile(data);
      setEditing(false);
      notify("Profile updated successfully ✅", "success");
    } catch (error) {
      console.error("Save profile error:", error);
      notify("Something went wrong", "error");
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
    setPage?.("home");
  };

  if (loading || !profile) {
    return (
      <div className="profile-page profile-account-page">
        <div className="profile-account-title">My Account</div>
        <div className="profile-account-header profile-loading-block loading" />
      </div>
    );
  }

  return (
    <div className="profile-page profile-account-page">
      <div className="profile-account-title">My Account</div>

      <section className="profile-account-header">
        <div className="profile-account-avatar">{initials}</div>

        <div className="profile-account-info">
          <h2>{profile.full_name || "NutriBlend Member"}</h2>
          <p>{email}</p>
          <p>{phone}</p>
        </div>

        <button
          type="button"
          className="profile-account-edit"
          onClick={() => setEditing((open) => !open)}
        >
          {editing ? "Close" : "Edit"}
        </button>
      </section>

      {editing && (
        <form className="profile-edit-panel" onSubmit={saveProfile}>
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
            <button type="button" onClick={cancelEdit} disabled={saving}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="profile-account-list">
        {accountRows.map((item) => (
          <AccountRow key={item.label} item={item} />
        ))}
      </div>

      <div className="profile-account-logout-wrap">
        <button type="button" className="profile-account-logout" onClick={logout}>
          <LogOut size={20} />
          Logout
        </button>
        <p>Version 1.0.0 Build NutriBlend</p>
      </div>
    </div>
  );
}

function AccountRow({ item }) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      className={`profile-account-row ${item.separated ? "is-separated" : ""}`}
      onClick={item.action}
    >
      <span className="profile-account-row-icon">
        <Icon size={21} />
      </span>
      <span className="profile-account-row-text">
        <strong>{item.label}</strong>
        {item.sub && <small>{item.sub}</small>}
      </span>
      <ChevronRight size={24} className="profile-account-chevron" />
    </button>
  );
}
