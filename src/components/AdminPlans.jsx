import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase/Client";

const emptyForm = {
  name: "",
  price: "",
  protein: "",
  duration: "",
  tag: "",
  image: "📅",
  description: "",
  best_for: "",
  includes: "",
  is_active: true,
};

const parseIncludes = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export default function AdminPlans({ notify }) {
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const isEditing = Boolean(editingId);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("plans")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch plans error:", error);
      notify?.("Failed to load plans", "error");
    } else {
      setPlans(data || []);
    }

    setLoading(false);
  };

  const filteredPlans = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return plans.filter((plan) => {
      const matchesSearch =
        !query ||
        String(plan.name || "").toLowerCase().includes(query) ||
        String(plan.protein || "").toLowerCase().includes(query) ||
        String(plan.duration || "").toLowerCase().includes(query) ||
        String(plan.tag || "").toLowerCase().includes(query) ||
        String(plan.best_for || "").toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "Active" && plan.is_active) ||
        (statusFilter === "Inactive" && !plan.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [plans, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: plans.length,
      active: plans.filter((plan) => plan.is_active).length,
      inactive: plans.filter((plan) => !plan.is_active).length,
    };
  }, [plans]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const validateForm = () => {
    if (!form.name.trim()) {
      notify?.("Plan name is required", "error");
      return false;
    }

    if (!form.price || Number(form.price) <= 0) {
      notify?.("Valid plan price is required", "error");
      return false;
    }

    return true;
  };

  const buildPayload = () => ({
    name: form.name.trim(),
    category: "Plans",
    price: Number(form.price),
    protein: form.protein.trim(),
    duration: form.duration.trim(),
    tag: form.tag.trim(),
    image: form.image.trim(),
    description: form.description.trim(),
    best_for: form.best_for.trim(),
    includes: form.includes.trim(),
    is_active: form.is_active,
  });

  const savePlan = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      const payload = buildPayload();

      if (isEditing) {
        const { error } = await supabase
          .from("plans")
          .update(payload)
          .eq("id", editingId);

        if (error) throw error;

        notify?.("Plan updated successfully ✅", "success");
      } else {
        const { error } = await supabase.from("plans").insert([payload]);

        if (error) throw error;

        notify?.("Plan added successfully ✅", "success");
      }

      resetForm();
      await fetchPlans();
    } catch (error) {
      console.error("Save plan error:", error);
      notify?.(error.message || "Failed to save plan", "error");
    } finally {
      setLoading(false);
    }
  };

  const editPlan = (plan) => {
    setEditingId(plan.id);

    setForm({
      name: plan.name || "",
      price: plan.price || "",
      protein: plan.protein || "",
      duration: plan.duration || "",
      tag: plan.tag || "",
      image: plan.image || "📅",
      description: plan.description || "",
      best_for: plan.best_for || "",
      includes: plan.includes || "",
      is_active: plan.is_active ?? true,
    });

    document
      .querySelector(".admin-plan-form")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const deletePlan = async (plan) => {
    const confirmDelete = window.confirm(
      `Delete "${plan.name}"?\n\nThis plan will be removed from the store.`
    );

    if (!confirmDelete) return;

    setLoading(true);

    const { error } = await supabase.from("plans").delete().eq("id", plan.id);

    if (error) {
      console.error("Delete plan error:", error);
      notify?.("Failed to delete plan", "error");
    } else {
      notify?.("Plan deleted ✅", "success");
      await fetchPlans();

      if (editingId === plan.id) resetForm();
    }

    setLoading(false);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("All");
  };

  return (
    <section className="admin-products-section">
      <div className="admin-products-header">
        <div>
          <p className="admin-eyebrow">Plan Control</p>
          <h3>Manage Subscription Plans</h3>
          <p className="admin-products-subtitle">
            Add, edit, activate, deactivate, and delete NutriBlend plans.
          </p>
        </div>

        <button className="refresh-btn" onClick={fetchPlans} disabled={loading}>
          {loading ? "Loading..." : "Refresh Plans"}
        </button>
      </div>

      <div className="admin-product-stats">
        <ProductStat icon="📅" label="Total Plans" value={stats.total} />
        <ProductStat icon="✅" label="Active" value={stats.active} />
        <ProductStat icon="⏸️" label="Inactive" value={stats.inactive} />
      </div>

      <form className="admin-product-form admin-plan-form" onSubmit={savePlan}>
        <div className="admin-product-form-head">
          <div>
            <h4>{isEditing ? "Edit Plan" : "Add New Plan"}</h4>
            <p>
              {isEditing
                ? "You are editing an existing subscription plan."
                : "Create a new plan for the Home page."}
            </p>
          </div>

          {isEditing && <span className="admin-edit-mode-badge">Edit Mode</span>}
        </div>

        <div className="admin-product-form-layout">
          <div className="admin-form-grid">
            <input
              name="name"
              placeholder="Plan name"
              value={form.name}
              onChange={handleChange}
              required
            />

            <input
              name="price"
              type="number"
              placeholder="Price"
              value={form.price}
              onChange={handleChange}
              required
            />

            <input
              name="protein"
              placeholder="Protein e.g. 20g"
              value={form.protein}
              onChange={handleChange}
            />

            <input
              name="duration"
              placeholder="Duration e.g. 26 Days"
              value={form.duration}
              onChange={handleChange}
            />

            <input
              name="tag"
              placeholder="Tag e.g. Most Popular"
              value={form.tag}
              onChange={handleChange}
            />

            <input
              name="image"
              placeholder="Emoji or image e.g. 🔥"
              value={form.image}
              onChange={handleChange}
            />

            <input
              className="admin-form-wide"
              name="best_for"
              placeholder="Best for e.g. Students, gym users, hostelers"
              value={form.best_for}
              onChange={handleChange}
            />

            <textarea
              className="admin-form-wide"
              name="description"
              placeholder="Plan description"
              value={form.description}
              onChange={handleChange}
              rows="3"
            />

            <textarea
              className="admin-form-wide"
              name="includes"
              placeholder="Includes comma separated. Example: 26 shakes, 20g protein, Best value plan"
              value={form.includes}
              onChange={handleChange}
              rows="3"
            />

            <label className="admin-active-toggle admin-form-wide">
              <input
                type="checkbox"
                name="is_active"
                checked={form.is_active}
                onChange={handleChange}
              />
              <span>Show this plan on Home page</span>
            </label>
          </div>

          <div className="admin-image-preview-card">
            <span>Plan Preview</span>

            <div className="admin-plan-preview-box">
              <strong>{form.image || "📅"}</strong>
              <h4>{form.name || "Plan Name"}</h4>
              <p>{form.duration || "Duration"}</p>
              <b>₹{form.price || 0}</b>
            </div>

            <div className="admin-plan-includes-preview">
              {parseIncludes(form.includes).slice(0, 4).map((item) => (
                <span key={item}>✓ {item}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="admin-product-actions">
          <button
            type="submit"
            className="admin-save-product-btn"
            disabled={loading}
          >
            {loading ? "Saving..." : isEditing ? "Update Plan" : "Add Plan"}
          </button>

          <button
            type="button"
            className="admin-cancel-product-btn"
            onClick={resetForm}
          >
            {isEditing ? "Cancel Edit" : "Clear Form"}
          </button>
        </div>
      </form>

      <div className="admin-product-tools">
        <input
          type="text"
          placeholder="Search plans by name, tag, duration, protein..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="All">All Plans</option>
          <option value="Active">Active Only</option>
          <option value="Inactive">Inactive Only</option>
        </select>

        {(searchTerm || statusFilter !== "All") && (
          <button onClick={clearFilters}>Clear</button>
        )}

        <span>
          Showing {filteredPlans.length} / {plans.length}
        </span>
      </div>

      <div className="admin-products-table-wrap">
        {loading && plans.length === 0 ? (
          <div className="admin-empty">
            <p>Loading plans...</p>
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className="admin-empty">
            <p>No matching plans found</p>
          </div>
        ) : (
          <table className="admin-products-table">
            <thead>
              <tr>
                <th>Plan</th>
                <th>Duration</th>
                <th>Protein</th>
                <th>Price</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredPlans.map((plan) => (
                <tr key={plan.id}>
                  <td>
                    <div className="admin-product-name">
                      <strong>
                        {plan.image || "📅"} {plan.name}
                      </strong>
                      <span>{plan.description || "No description"}</span>
                    </div>
                  </td>

                  <td>{plan.duration || "N/A"}</td>
                  <td>{plan.protein || "N/A"}</td>

                  <td>
                    <strong>
                      ₹{Number(plan.price || 0).toLocaleString("en-IN")}
                    </strong>
                  </td>

                  <td>
                    <span
                      className={`admin-product-category-chip ${
                        plan.is_active ? "" : "inactive"
                      }`}
                    >
                      {plan.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>

                  <td>
                    <div className="admin-product-row-actions">
                      <button onClick={() => editPlan(plan)}>Edit</button>
                      <button
                        className="danger"
                        onClick={() => deletePlan(plan)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

function ProductStat({ icon, label, value }) {
  return (
    <div className="admin-product-stat-card">
      <span>{icon}</span>
      <div>
        <strong>{value}</strong>
        <p>{label}</p>
      </div>
    </div>
  );
}