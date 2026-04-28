import { useEffect, useState } from "react";
import { supabase } from "../supabase/Client";

export default function Profile() {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: userData } = await supabase.auth.getUser();

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userData.user.id)
      .single();

    setProfile(data);
  };

  if (!profile) return <p style={{ color: "white" }}>Loading...</p>;

  return (
    <div style={styles.container}>
      <h2>My Profile</h2>

      <div style={styles.card}>
        <p><b>Name:</b> {profile.full_name}</p>
        <p><b>Email:</b> {profile.email}</p>
        <p><b>Phone:</b> {profile.phone}</p>
        <p><b>Address:</b> {profile.address}</p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    color: "white",
  },
  card: {
    background: "#020617",
    padding: "20px",
    borderRadius: "10px",
    marginTop: "10px",
  },
};