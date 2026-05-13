import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../supabase/Client";
import { useNotification } from "../context/NotificationContext";
import ConfirmModal from "../components/ConfirmModal";
import "../styles/address.css";

const ADDRESS_TYPES = [
  { value: "Home", icon: "🏠", label: "Home" },
  { value: "Hostel", icon: "🏫", label: "Hostel" },
  { value: "Gym", icon: "🏋️", label: "Gym" },
  { value: "Office", icon: "🏢", label: "Office" },
  { value: "Other", icon: "📍", label: "Other" },
];

const EMPTY_FORM = {
  name: "",
  phone: "",
  street: "",
  landmark: "",
  city: "",
  state: "",
  pincode: "",
  type: "Home",
  isDefault: false,
};

const getAddressIcon = (type) => {
  return ADDRESS_TYPES.find((item) => item.value === type)?.icon || "📍";
};

const cleanText = (value) => String(value || "").trim();

const normalizeDbAddress = (addr) => ({
  id: addr.id,
  user_id: addr.user_id,
  name: addr.name || "",
  phone: addr.phone || "",
  street: addr.street || "",
  landmark: addr.landmark || "",
  city: addr.city || "",
  state: addr.state || "",
  pincode: addr.pincode || "",
  type: addr.type || "Home",
  isDefault: Boolean(addr.is_default),
  createdAt: addr.created_at,
  updatedAt: addr.updated_at,
});

const toDbAddress = (form, userId) => ({
  user_id: userId,
  name: cleanText(form.name),
  phone: cleanText(form.phone),
  street: cleanText(form.street),
  landmark: cleanText(form.landmark),
  city: cleanText(form.city),
  state: cleanText(form.state),
  pincode: cleanText(form.pincode),
  type: form.type || "Home",
  is_default: Boolean(form.isDefault),
  updated_at: new Date().toISOString(),
});

export default function Addresses({ setPage, setAddress }) {
  const [user, setUser] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [form, setForm] = useState(EMPTY_FORM);

  const formRef = useRef(null);
  const { notify } = useNotification();

  const fetchAddresses = useCallback(async () => {
    setLoading(true);
    setFormError("");

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData.user) {
        setFormError("Please login to manage delivery addresses.");
        setAddresses([]);
        setSelectedAddress(null);
        setAddress?.(null);
        return;
      }

      setUser(userData.user);

      const { data, error } = await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", userData.user.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      const normalized = (data || []).map(normalizeDbAddress);
      setAddresses(normalized);

      const savedSelectedId = localStorage.getItem("selectedAddressId");
      const selectedFromStorage = normalized.find(
        (addr) => String(addr.id) === String(savedSelectedId)
      );

      const defaultAddress =
        normalized.find((addr) => addr.isDefault) || normalized[0] || null;

      const finalSelected = selectedFromStorage || defaultAddress;

      setSelectedAddress(finalSelected);
      setAddress?.(finalSelected);

      if (finalSelected) {
        localStorage.setItem("selectedAddressId", finalSelected.id);
        localStorage.setItem("selectedAddress", JSON.stringify(finalSelected));
      } else {
        localStorage.removeItem("selectedAddressId");
        localStorage.removeItem("selectedAddress");
      }
    } catch (error) {
      console.error("Fetch addresses error:", error);
      setFormError(error.message || "Failed to load addresses.");
    } finally {
      setLoading(false);
    }
  }, [setAddress]);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  const selectedAddressId = selectedAddress?.id;

  const filteredAddresses = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return addresses;

    return addresses.filter((addr) =>
      [
        addr.name,
        addr.phone,
        addr.street,
        addr.landmark,
        addr.city,
        addr.state,
        addr.pincode,
        addr.type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [addresses, search]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormError("");

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
    setFormError("");
  };

  const openAddForm = () => {
    setForm({
      ...EMPTY_FORM,
      isDefault: addresses.length === 0,
    });

    setEditingId(null);
    setShowForm(true);

    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const validateForm = () => {
    const phoneRegex = /^[6-9]\d{9}$/;
    const pincodeRegex = /^\d{6}$/;

    if (!cleanText(form.name)) return "Full name is required.";

    if (!phoneRegex.test(form.phone)) {
      return "Enter a valid 10-digit Indian phone number.";
    }

    if (!cleanText(form.street)) return "Flat / building / street is required.";
    if (!cleanText(form.city)) return "City is required.";
    if (!cleanText(form.state)) return "State is required.";
    if (!pincodeRegex.test(form.pincode)) return "Enter a valid 6-digit pincode.";

    return "";
  };

  const selectAddress = (addr) => {
    setSelectedAddress(addr);
    setAddress?.(addr);
    localStorage.setItem("selectedAddressId", addr.id);
    localStorage.setItem("selectedAddress", JSON.stringify(addr));
    notify("Delivery address selected ✅", "success");
  };

  const saveAddress = async (e) => {
    e.preventDefault();

    if (!user) {
      setFormError("Please login to save address.");
      notify("Please login to save address ❌", "error");
      return;
    }

    const error = validateForm();

    if (error) {
      setFormError(error);
      notify(error, "error");
      return;
    }

    setSaving(true);
    setFormError("");

    try {
      const shouldBeDefault = form.isDefault || addresses.length === 0;

      if (shouldBeDefault) {
        const { error: clearDefaultError } = await supabase
          .from("addresses")
          .update({ is_default: false })
          .eq("user_id", user.id);

        if (clearDefaultError) throw clearDefaultError;
      }

      const payload = {
        ...toDbAddress(form, user.id),
        is_default: shouldBeDefault,
      };

      let savedAddress;

      if (editingId) {
        const { data, error: updateError } = await supabase
          .from("addresses")
          .update(payload)
          .eq("id", editingId)
          .eq("user_id", user.id)
          .select("*")
          .single();

        if (updateError) throw updateError;

        savedAddress = normalizeDbAddress(data);
        notify("Address updated ✅", "success");
      } else {
        const { data, error: insertError } = await supabase
          .from("addresses")
          .insert([{ ...payload, created_at: new Date().toISOString() }])
          .select("*")
          .single();

        if (insertError) throw insertError;

        savedAddress = normalizeDbAddress(data);
        notify("Address added ✅", "success");
      }

      await fetchAddresses();

      if (
        shouldBeDefault ||
        selectedAddress?.id === savedAddress.id ||
        addresses.length === 0
      ) {
        setSelectedAddress(savedAddress);
        setAddress?.(savedAddress);
        localStorage.setItem("selectedAddressId", savedAddress.id);
        localStorage.setItem("selectedAddress", JSON.stringify(savedAddress));
      }

      resetForm();
    } catch (error) {
      console.error("Save address error:", error);
      setFormError(error.message || "Failed to save address.");
      notify(error.message || "Failed to save address ❌", "error");
    } finally {
      setSaving(false);
    }
  };

  const setDefaultAddress = async (addr) => {
    if (!user) {
      notify("Please login first ❌", "error");
      return;
    }

    try {
      const { error: clearError } = await supabase
        .from("addresses")
        .update({ is_default: false })
        .eq("user_id", user.id);

      if (clearError) throw clearError;

      const { data, error: setError } = await supabase
        .from("addresses")
        .update({
          is_default: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", addr.id)
        .eq("user_id", user.id)
        .select("*")
        .single();

      if (setError) throw setError;

      const updatedDefaultAddress = normalizeDbAddress(data);

      setAddresses((prev) =>
        prev.map((item) => ({
          ...item,
          isDefault: item.id === updatedDefaultAddress.id,
        }))
      );

      setSelectedAddress(updatedDefaultAddress);
      setAddress?.(updatedDefaultAddress);
      localStorage.setItem("selectedAddressId", updatedDefaultAddress.id);
      localStorage.setItem(
        "selectedAddress",
        JSON.stringify(updatedDefaultAddress)
      );

      notify("Default address selected ✅", "success");
    } catch (error) {
      console.error("Default address error:", error);
      notify(error.message || "Failed to set default address ❌", "error");
    }
  };

  const editAddress = (addr) => {
    setForm({
      name: addr.name || "",
      phone: addr.phone || "",
      street: addr.street || "",
      landmark: addr.landmark || "",
      city: addr.city || "",
      state: addr.state || "",
      pincode: addr.pincode || "",
      type: addr.type || "Home",
      isDefault: addr.isDefault || false,
    });

    setEditingId(addr.id);
    setShowForm(true);
    setFormError("");

    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const confirmDeleteAddress = async () => {
    if (!deleteTarget || !user) return;

    setDeleteLoading(true);

    try {
      const { error } = await supabase
        .from("addresses")
        .delete()
        .eq("id", deleteTarget.id)
        .eq("user_id", user.id);

      if (error) throw error;

      const updated = addresses.filter((addr) => addr.id !== deleteTarget.id);
      setAddresses(updated);

      if (selectedAddress?.id === deleteTarget.id) {
        const nextDefault =
          updated.find((addr) => addr.isDefault) || updated[0] || null;

        setSelectedAddress(nextDefault);
        setAddress?.(nextDefault);

        if (nextDefault) {
          localStorage.setItem("selectedAddressId", nextDefault.id);
          localStorage.setItem("selectedAddress", JSON.stringify(nextDefault));
        } else {
          localStorage.removeItem("selectedAddressId");
          localStorage.removeItem("selectedAddress");
        }
      }

      notify("Address deleted ✅", "success");
      setDeleteTarget(null);
    } catch (error) {
      console.error("Delete address error:", error);
      notify(error.message || "Failed to delete address ❌", "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  const goToPayment = () => {
    if (!selectedAddress) {
      notify("Please select one delivery address first ❌", "error");
      return;
    }

    setAddress?.(selectedAddress);
    localStorage.setItem("selectedAddressId", selectedAddress.id);
    localStorage.setItem("selectedAddress", JSON.stringify(selectedAddress));
    setPage?.("payment");
  };

  if (loading) {
    return (
      <div className="address-page">
        <div className="address-shell">
          <div className="address-form-card">
            <div className="home-skeleton-text loading" />
            <div className="home-skeleton-text-sm loading" />
            <div className="home-skeleton-text-sm loading" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="address-page">
      <div className="address-shell">
        <div className="address-heading">
          <div>
            <p className="address-eyebrow">Delivery Address</p>
            <h2>Choose where to deliver</h2>
            <p className="address-subtitle">
              Save all your delivery locations like home, hostel, gym, office,
              or any other place. Select one address before moving to payment.
            </p>
          </div>

          <button className="address-add-top-btn" onClick={openAddForm}>
            + Add New Address
          </button>
        </div>

        {selectedAddress && (
          <div className="selected-address-panel">
            <div className="selected-address-left">
              <span>{getAddressIcon(selectedAddress.type)}</span>

              <div>
                <p className="selected-label">Delivering to</p>
                <h3>
                  {selectedAddress.name}{" "}
                  <small>• {selectedAddress.type || "Address"}</small>
                </h3>
                <p>
                  {selectedAddress.street}
                  {selectedAddress.landmark
                    ? `, Near ${selectedAddress.landmark}`
                    : ""}
                  , {selectedAddress.city}, {selectedAddress.state} -{" "}
                  {selectedAddress.pincode}
                </p>
                <p>📞 {selectedAddress.phone}</p>
              </div>
            </div>

            <button onClick={goToPayment}>Continue to Payment →</button>
          </div>
        )}

        {showForm && (
          <form
            ref={formRef}
            className="address-form-card address-form-full"
            onSubmit={saveAddress}
          >
            <div className="address-card-head">
              <div>
                <h3>{editingId ? "Edit Address" : "Add New Address"}</h3>
                <span>
                  Enter delivery details the same way you do on shopping apps.
                </span>
              </div>

              <button
                type="button"
                className="address-close-form-btn"
                onClick={resetForm}
              >
                ✕
              </button>
            </div>

            {formError && <div className="address-error-box">{formError}</div>}

            <div className="address-type-selector">
              {ADDRESS_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  className={form.type === type.value ? "active" : ""}
                  onClick={() =>
                    setForm((prev) => ({ ...prev, type: type.value }))
                  }
                >
                  <span>{type.icon}</span>
                  {type.label}
                </button>
              ))}
            </div>

            <div className="address-form-grid">
              <label>
                Full Name
                <input
                  name="name"
                  placeholder="Receiver name"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                Mobile Number
                <input
                  name="phone"
                  placeholder="10-digit phone number"
                  value={form.phone}
                  onChange={handleChange}
                  maxLength="10"
                  required
                />
              </label>

              <label className="address-form-wide">
                Flat / House No. / Building / Area
                <input
                  name="street"
                  placeholder="Example: Flat 203, SR Hostel, Madhapur"
                  value={form.street}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                Landmark
                <input
                  name="landmark"
                  placeholder="Near gym / college / office"
                  value={form.landmark}
                  onChange={handleChange}
                />
              </label>

              <label>
                City
                <input
                  name="city"
                  placeholder="City"
                  value={form.city}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                State
                <input
                  name="state"
                  placeholder="State"
                  value={form.state}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                Pincode
                <input
                  name="pincode"
                  placeholder="6-digit pincode"
                  value={form.pincode}
                  onChange={handleChange}
                  maxLength="6"
                  required
                />
              </label>
            </div>

            <label className="default-check">
              <input
                type="checkbox"
                name="isDefault"
                checked={form.isDefault}
                onChange={handleChange}
              />
              Set this as default delivery address
            </label>

            <div className="address-form-actions">
              <button
                className="address-primary-btn"
                type="submit"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingId
                  ? "Update Address"
                  : "Save Address"}
              </button>

              <button
                className="address-secondary-btn"
                type="button"
                onClick={resetForm}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {!showForm && formError && (
          <div className="address-error-box">{formError}</div>
        )}

        <div className="address-book-section">
          <div className="address-book-head">
            <div>
              <h3>Your Saved Addresses</h3>
              <p>
                {addresses.length} saved address
                {addresses.length !== 1 ? "es" : ""}
              </p>
            </div>

            <div className="address-search-wrap">
              <input
                type="text"
                placeholder="Search address, phone, city..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {filteredAddresses.length === 0 ? (
            <div className="address-empty-state">
              <span>📭</span>
              <h3>
                {addresses.length === 0
                  ? "No addresses saved yet"
                  : "No matching address found"}
              </h3>
              <p>
                {addresses.length === 0
                  ? "Add your first delivery address to continue checkout."
                  : "Try searching by name, city, phone, gym, hostel, or office."}
              </p>

              {addresses.length === 0 && (
                <button onClick={openAddForm}>Add Address</button>
              )}
            </div>
          ) : (
            <div className="address-list">
              {filteredAddresses.map((addr) => {
                const isSelected = selectedAddressId === addr.id;

                return (
                  <article
                    key={addr.id}
                    className={`address-item ${isSelected ? "is-selected" : ""}`}
                    onClick={() => selectAddress(addr)}
                  >
                    <div className="address-radio">
                      <span>{isSelected ? "✓" : ""}</span>
                    </div>

                    <div className="address-item-content">
                      <div className="address-item-top">
                        <div>
                          <div className="address-name-row">
                            <span className="address-type-icon">
                              {getAddressIcon(addr.type)}
                            </span>
                            <p className="address-name">
                              <b>{addr.name}</b>
                            </p>
                          </div>

                          <p className="address-phone">📞 {addr.phone}</p>
                        </div>

                        <div className="address-chip-group">
                          <span className="address-type-chip">{addr.type}</span>

                          {addr.isDefault && (
                            <span className="address-chip">Default</span>
                          )}

                          {isSelected && (
                            <span className="address-chip selected">
                              Selected
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="address-text">
                        {addr.street}
                        {addr.landmark ? `, Near ${addr.landmark}` : ""},{" "}
                        {addr.city}, {addr.state} - {addr.pincode}
                      </p>

                      <div
                        className="address-actions"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button type="button" onClick={() => selectAddress(addr)}>
                          {isSelected ? "Selected" : "Deliver Here"}
                        </button>

                        <button
                          type="button"
                          onClick={() => setDefaultAddress(addr)}
                        >
                          Make Default
                        </button>

                        <button type="button" onClick={() => editAddress(addr)}>
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeleteTarget(addr)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <div className="address-bottom-bar">
          <div>
            <span>Selected Address</span>
            <strong>
              {selectedAddress
                ? `${selectedAddress.name} • ${selectedAddress.type}`
                : "No address selected"}
            </strong>
          </div>

          <button
            className="address-primary-btn address-continue-btn"
            onClick={goToPayment}
            disabled={!selectedAddress}
          >
            Continue to Payment
          </button>
        </div>
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Address?"
        message={
          deleteTarget
            ? `${deleteTarget.name}'s ${deleteTarget.type} address will be permanently removed.`
            : "This address will be permanently removed."
        }
        confirmText="Delete"
        cancelText="Keep"
        danger
        loading={deleteLoading}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteAddress}
      />
    </div>
  );
}