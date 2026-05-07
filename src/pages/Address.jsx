import { useState, useEffect } from "react";
import "../styles/address.css";

export default function Addresses({ setPage, setAddress }) {
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    street: "",
    city: "",
    state: "",
    pincode: "",
    type: "Home",
    isDefault: false,
  });

  useEffect(() => {
    const savedAddresses = JSON.parse(localStorage.getItem("addresses")) || [];
    const savedSelectedAddress = JSON.parse(
      localStorage.getItem("selectedAddress")
    );

    setAddresses(savedAddresses);

    if (savedSelectedAddress) {
      setSelectedAddress(savedSelectedAddress);
      setAddress(savedSelectedAddress);
      return;
    }

    const defaultAddress = savedAddresses.find((addr) => addr.isDefault);

    if (defaultAddress) {
      setSelectedAddress(defaultAddress);
      setAddress(defaultAddress);
      localStorage.setItem("selectedAddress", JSON.stringify(defaultAddress));
    }
  }, [setAddress]);

  useEffect(() => {
    localStorage.setItem("addresses", JSON.stringify(addresses));
  }, [addresses]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const resetForm = () => {
    setForm({
      name: "",
      phone: "",
      street: "",
      city: "",
      state: "",
      pincode: "",
      type: "Home",
      isDefault: false,
    });

    setEditingId(null);
  };

  const validateForm = () => {
    const phoneRegex = /^[6-9]\d{9}$/;
    const pincodeRegex = /^\d{6}$/;

    if (!phoneRegex.test(form.phone)) {
      alert("Enter a valid 10-digit Indian phone number");
      return false;
    }

    if (!pincodeRegex.test(form.pincode)) {
      alert("Enter a valid 6-digit pincode");
      return false;
    }

    return true;
  };

  const saveAddress = (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    let updatedAddresses = [];

    if (editingId) {
      updatedAddresses = addresses.map((addr) =>
        addr.id === editingId
          ? {
              ...addr,
              ...form,
              id: editingId,
            }
          : addr
      );

      if (form.isDefault) {
        updatedAddresses = updatedAddresses.map((addr) => ({
          ...addr,
          isDefault: addr.id === editingId,
        }));
      }

      const updatedSelectedAddress = updatedAddresses.find(
        (addr) => addr.id === selectedAddress?.id
      );

      if (updatedSelectedAddress) {
        setSelectedAddress(updatedSelectedAddress);
        setAddress(updatedSelectedAddress);
        localStorage.setItem(
          "selectedAddress",
          JSON.stringify(updatedSelectedAddress)
        );
      }

      alert("Address updated ✅");
    } else {
      const newAddress = {
        id: Date.now(),
        ...form,
      };

      updatedAddresses = [...addresses, newAddress];

      if (form.isDefault) {
        updatedAddresses = updatedAddresses.map((addr) => ({
          ...addr,
          isDefault: addr.id === newAddress.id,
        }));
      }

      // ✅ Select automatically only if this is the first address
      // ✅ Otherwise user can select their wish address manually
      if (addresses.length === 0 || form.isDefault) {
        setSelectedAddress(newAddress);
        setAddress(newAddress);
        localStorage.setItem("selectedAddress", JSON.stringify(newAddress));
      }

      alert("Address added ✅");
    }

    setAddresses(updatedAddresses);
    resetForm();
  };

  const selectAddress = (addr) => {
    setSelectedAddress(addr);
    setAddress(addr);
    localStorage.setItem("selectedAddress", JSON.stringify(addr));
    alert("Address selected ✅");
  };

  const setDefaultAddress = (addr) => {
    const updated = addresses.map((item) => ({
      ...item,
      isDefault: item.id === addr.id,
    }));

    const updatedDefaultAddress = {
      ...addr,
      isDefault: true,
    };

    setAddresses(updated);
    setSelectedAddress(updatedDefaultAddress);
    setAddress(updatedDefaultAddress);
    localStorage.setItem("selectedAddress", JSON.stringify(updatedDefaultAddress));

    alert("Default address selected ✅");
  };

  const editAddress = (addr) => {
    setForm({
      name: addr.name || "",
      phone: addr.phone || "",
      street: addr.street || "",
      city: addr.city || "",
      state: addr.state || "",
      pincode: addr.pincode || "",
      type: addr.type || "Home",
      isDefault: addr.isDefault || false,
    });

    setEditingId(addr.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteAddress = (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this address?"
    );

    if (!confirmDelete) return;

    const updated = addresses.filter((addr) => addr.id !== id);
    setAddresses(updated);

    if (selectedAddress?.id === id) {
      setSelectedAddress(null);
      setAddress(null);
      localStorage.removeItem("selectedAddress");
    }

    alert("Address deleted ✅");
  };

  const goToPayment = () => {
    if (!selectedAddress) {
      alert("Please select one delivery address first");
      return;
    }

    setAddress(selectedAddress);
    localStorage.setItem("selectedAddress", JSON.stringify(selectedAddress));
    setPage("payment");
  };

  const filteredAddresses = addresses.filter((addr) =>
    `${addr.name} ${addr.phone} ${addr.city} ${addr.state} ${addr.street} ${addr.type}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="address-page">
      <div className="address-shell">
        <div className="address-heading">
          <p className="address-eyebrow">Delivery Details</p>
          <h2>Saved Addresses</h2>
          <p className="address-subtitle">
            Add multiple addresses and choose where you want your order delivered.
          </p>
        </div>

        <input
          type="text"
          placeholder="🔍 Search address..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="address-search"
        />

        <div className="address-layout">
          <form className="address-form-card" onSubmit={saveAddress}>
            <div className="address-card-head">
              <h3>{editingId ? "Edit Address" : "Add New Address"}</h3>
              <span>You can save more than one address</span>
            </div>

            <div className="address-form-grid">
              <input
                name="name"
                placeholder="Full Name"
                value={form.name}
                onChange={handleChange}
                required
              />

              <input
                name="phone"
                placeholder="Phone Number"
                value={form.phone}
                onChange={handleChange}
                maxLength="10"
                required
              />

              <select
                name="type"
                value={form.type}
                onChange={handleChange}
                required
              >
                <option value="Home">Home</option>
                <option value="Hostel">Hostel</option>
                <option value="Office">Office</option>
                <option value="Gym">Gym</option>
                <option value="Other">Other</option>
              </select>

              <input
                name="state"
                placeholder="State"
                value={form.state}
                onChange={handleChange}
                required
              />

              <input
                className="address-form-wide"
                name="street"
                placeholder="Street Address / Building / Area"
                value={form.street}
                onChange={handleChange}
                required
              />

              <input
                name="city"
                placeholder="City"
                value={form.city}
                onChange={handleChange}
                required
              />

              <input
                name="pincode"
                placeholder="Pincode"
                value={form.pincode}
                onChange={handleChange}
                maxLength="6"
                required
              />
            </div>

            <label className="default-check">
              <input
                type="checkbox"
                name="isDefault"
                checked={form.isDefault}
                onChange={handleChange}
              />
              Set this as default address
            </label>

            <div className="address-form-actions">
              <button className="address-primary-btn" type="submit">
                {editingId ? "Update Address" : "Save Address"}
              </button>

              {editingId && (
                <button
                  className="address-secondary-btn"
                  type="button"
                  onClick={resetForm}
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>

          <div className="address-list-panel">
            <div className="address-card-head">
              <h3>Your Address Book</h3>
              <span>{addresses.length} saved</span>
            </div>

            {filteredAddresses.length === 0 ? (
              <div className="address-empty-state">
                <p>No matching addresses.</p>
              </div>
            ) : (
              <div className="address-list">
                {filteredAddresses.map((addr) => (
                  <div
                    key={addr.id}
                    className={`address-item ${
                      selectedAddress?.id === addr.id ? "is-selected" : ""
                    }`}
                  >
                    <div className="address-item-top">
                      <div>
                        <p className="address-name">
                          <b>{addr.name}</b>
                        </p>
                        <p className="address-phone">{addr.phone}</p>
                      </div>

                      <div className="address-chip-group">
                        <span className="address-type-chip">{addr.type}</span>

                        {addr.isDefault && (
                          <span className="address-chip">Default</span>
                        )}

                        {selectedAddress?.id === addr.id && (
                          <span className="address-chip">Selected</span>
                        )}
                      </div>
                    </div>

                    <p className="address-text">
                      {addr.street}, {addr.city}, {addr.state} - {addr.pincode}
                    </p>

                    <div className="address-actions">
                      <button type="button" onClick={() => selectAddress(addr)}>
                        {selectedAddress?.id === addr.id
                          ? "Selected Address"
                          : "Select This Address"}
                      </button>

                      <button type="button" onClick={() => setDefaultAddress(addr)}>
                        Make Default
                      </button>

                      <button type="button" onClick={() => editAddress(addr)}>
                        Edit
                      </button>

                      <button type="button" onClick={() => deleteAddress(addr.id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {selectedAddress && (
          <div className="selected-address-panel">
            <h3>Currently Selected Delivery Address</h3>
            <p>
              <b>{selectedAddress.name}</b> • {selectedAddress.type}
            </p>
            <p>
              {selectedAddress.street}, {selectedAddress.city},{" "}
              {selectedAddress.state} - {selectedAddress.pincode}
            </p>
            <p>{selectedAddress.phone}</p>
          </div>
        )}

        <button
          className="address-primary-btn address-continue-btn"
          onClick={goToPayment}
          disabled={!selectedAddress}
        >
          Continue with Selected Address
        </button>
      </div>
    </div>
  );
}