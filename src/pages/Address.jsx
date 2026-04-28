import { useState, useEffect } from "react";

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
    pincode: ""
  });

  // LOAD
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("addresses")) || [];
    setAddresses(saved);

    const selected = JSON.parse(localStorage.getItem("selectedAddress"));
    if (selected) {
      setSelectedAddress(selected);
      setAddress(selected); // 🔥 sync with parent
    }
  }, []);

  // SAVE
  useEffect(() => {
    localStorage.setItem("addresses", JSON.stringify(addresses));
  }, [addresses]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // ADD / UPDATE
  const addAddress = (e) => {
    e.preventDefault();

    // 🔒 VALIDATION
    if (form.phone.length !== 10) {
      alert("Enter valid 10-digit phone");
      return;
    }

    if (form.pincode.length !== 6) {
      alert("Enter valid pincode");
      return;
    }

    let updated;

    if (editingId) {
      updated = addresses.map((addr) =>
        addr.id === editingId ? { ...form, id: editingId } : addr
      );
      setEditingId(null);
      alert("Address updated ✅");
    } else {
      const newAddress = {
        id: Date.now(),
        ...form
      };

      updated = [...addresses, newAddress];

      // AUTO SELECT
      setSelectedAddress(newAddress);
      setAddress(newAddress); // 🔥 FIX MAIN ISSUE
      localStorage.setItem("selectedAddress", JSON.stringify(newAddress));

      alert("Address added ✅");
    }

    setAddresses(updated);

    setForm({
      name: "",
      phone: "",
      street: "",
      city: "",
      pincode: ""
    });
  };

  const deleteAddress = (id) => {
    const updated = addresses.filter((addr) => addr.id !== id);
    setAddresses(updated);

    if (selectedAddress?.id === id) {
      setSelectedAddress(null);
      setAddress(null); // 🔥 sync
      localStorage.removeItem("selectedAddress");
    }
  };

  const selectAddress = (addr) => {
    setSelectedAddress(addr);
    setAddress(addr); // 🔥 FIX MAIN ISSUE
    localStorage.setItem("selectedAddress", JSON.stringify(addr));
  };

  const editAddress = (addr) => {
    setForm(addr);
    setEditingId(addr.id);
  };

  const goToPayment = () => {
    if (!selectedAddress) {
      alert("Select address first");
      return;
    }

    setAddress(selectedAddress); // 🔥 ensure sync
    setPage("payment");
  };

  // SEARCH
  const filteredAddresses = addresses.filter((addr) =>
    `${addr.name} ${addr.city} ${addr.street}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="address-page">
      <div className="address-shell">

        {/* HEADER */}
        <div className="address-heading">
          <p className="address-eyebrow">Delivery Details</p>
          <h2>Saved Addresses</h2>
          <p className="address-subtitle">
            Keep your delivery details neat and ready for checkout.
          </p>
        </div>

        {/* SEARCH */}
        <input
          type="text"
          placeholder="🔍 Search address..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="address-search"
        />

        <div className="address-layout">

          {/* FORM */}
          <form className="address-form-card" onSubmit={addAddress}>
            <div className="address-card-head">
              <h3>{editingId ? "Edit Address" : "Add New Address"}</h3>
              <span>For faster checkout</span>
            </div>

            <div className="address-form-grid">
              <input name="name" placeholder="Full Name" value={form.name} onChange={handleChange} required />
              <input name="phone" placeholder="Phone Number" value={form.phone} onChange={handleChange} required />
              <input className="address-form-wide" name="street" placeholder="Street Address" value={form.street} onChange={handleChange} required />
              <input name="city" placeholder="City" value={form.city} onChange={handleChange} required />
              <input name="pincode" placeholder="Pincode" value={form.pincode} onChange={handleChange} required />
            </div>

            <button className="address-primary-btn" type="submit">
              {editingId ? "Update Address" : "Add Address"}
            </button>
          </form>

          {/* LIST */}
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
                    className={`address-item ${selectedAddress?.id === addr.id ? "is-selected" : ""}`}
                  >
                    <div className="address-item-top">
                      <div>
                        <p className="address-name"><b>{addr.name}</b></p>
                        <p className="address-phone">{addr.phone}</p>
                      </div>

                      {selectedAddress?.id === addr.id && (
                        <span className="address-chip">Selected</span>
                      )}
                    </div>

                    <p className="address-text">
                      {addr.street}, {addr.city} - {addr.pincode}
                    </p>

                    <div className="address-actions">
                      <button type="button" onClick={() => selectAddress(addr)}>
                        {selectedAddress?.id === addr.id ? "Using This Address" : "Select"}
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

        {/* SELECTED */}
        {selectedAddress && (
          <div className="selected-address-panel">
            <h3>Selected Address</h3>
            <p>{selectedAddress.name}</p>
            <p>
              {selectedAddress.street}, {selectedAddress.city} - {selectedAddress.pincode}
            </p>
            <p>{selectedAddress.phone}</p>
          </div>
        )}

        {/* CONTINUE */}
        <button
          className="address-primary-btn"
          onClick={goToPayment}
          disabled={!selectedAddress}
        >
          Continue to Payment
        </button>

      </div>
    </div>
  );
}