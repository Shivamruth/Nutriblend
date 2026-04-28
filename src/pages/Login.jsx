import { useState } from "react";
import { supabase } from "../supabase/Client";
import { FcGoogle } from "react-icons/fc";

export default function Login() {
  const [isSignup, setIsSignup] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleEmailAuth = async () => {
    if (!form.email || !form.password) {
      alert("Enter email & password");
      return;
    }

    if (isSignup) {
      const { error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      });

      if (error) alert(error.message);
      else alert("Signup successful! Now login.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });

      if (error) alert(error.message);
    }
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
    });
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>
          {isSignup ? "Create Account" : "Welcome Back 💪"}
        </h2>

        <input
          type="email"
          name="email"
          placeholder="Email"
          onChange={handleChange}
          style={styles.input}
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          onChange={handleChange}
          style={styles.input}
        />

        <button style={styles.mainBtn} onClick={handleEmailAuth}>
          {isSignup ? "Sign Up" : "Login"}
        </button>

        <div style={{ margin: "15px 0", color: "#aaa" }}>OR</div>

        <button style={styles.socialBtn} onClick={handleGoogleLogin}>
          <FcGoogle size={20} /> Continue with Google
        </button>

        <p style={styles.switchText}>
          {isSignup ? "Already have an account?" : "New user?"}{" "}
          <span onClick={() => setIsSignup(!isSignup)} style={styles.link}>
            {isSignup ? "Login" : "Sign Up"}
          </span>
        </p>
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
  mainBtn: {
    width: "100%",
    padding: "12px",
    background: "#84cc16",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },
  socialBtn: {
    width: "100%",
    padding: "10px",
    marginTop: "10px",
    background: "#1e293b",
    border: "none",
    borderRadius: "8px",
    color: "#fff",
    cursor: "pointer",
  },
  switchText: {
    marginTop: "15px",
    color: "#aaa",
  },
  link: {
    color: "#84cc16",
    cursor: "pointer",
  },
};