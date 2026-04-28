import { useState, useEffect } from "react";
import { supabase } from "../supabase/Client";

export default function CompleteProfile() {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
  });

  useEffect(() => {
    getUser();
  }, []);

  const getUser = async () => {
    const { data } = await supabase.auth.getUser();
    setUser(data.user);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!form.full_name || !form.phone) {
      alert("Fill all fields");
      return;
    }

    const { error } = await supabase.from("profiles").insert([
      {
        id: user.id,
        email: user.email,
        full_name: form.full_name,
        phone: form.phone,
      },
    ]);

    if (error) {
      alert(error.message);
    } else {
      window.location.reload(); // 🔥 go to Home via App.jsx logic
    }
  };

  if (!user) return <p style={{ color: "white" }}>Loading...</p>;

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Complete Your Profile</h2>

        <input
          name="full_name"
          placeholder="Full Name"
          onChange={handleChange}
          style={styles.input}
        />

        <input
          name="phone"
          placeholder="Phone"
          onChange={handleChange}
          style={styles.input}
        />

        <button style={styles.btn} onClick={handleSubmit}>
          Save & Continue
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#0f172a",
  },
  card: {
    background: "#020617",
    padding: "40px",
    borderRadius: "15px",
    width: "320px",
    textAlign: "center",
  },
  title: {
    color: "#fff",
  },
  input: {
    width: "100%",
    padding: "12px",
    margin: "10px 0",
    borderRadius: "8px",
    border: "none",
    background: "#1e293b",
    color: "#fff",
  },
  btn: {
    width: "100%",
    padding: "12px",
    background: "#84cc16",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },
};