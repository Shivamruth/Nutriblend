import { useState, useEffect } from "react";
import { supabase } from "../supabase/Client";
import { useNotification } from "../context/NotificationContext";
import "../styles/complete-profile.css";

const TOTAL_STEPS = 3;

const GOAL_OPTIONS = [
  "Muscle Gain",
  "Fat Loss",
  "Lean Bulk",
  "Strength",
  "Daily Protein",
  "Competition Prep",
];

const FITNESS_LEVELS = [
  "Beginner",
  "Consistent",
  "Athlete",
  "Transformation",
  "Competition Prep",
];

const WORKOUT_TYPES = [
  "Weight Training",
  "Cardio",
  "CrossFit",
  "Calisthenics",
  "Mixed",
];

const GENDER_OPTIONS = ["Male", "Female", "Other", "Prefer not to say"];

const DIET_OPTIONS = ["Veg", "Non-Veg", "Egg Only", "Vegan"];

const ALLERGY_OPTIONS = ["Lactose", "Nuts", "Gluten", "Soy", "None"];

const STEP_META = [
  { label: "Step 1 of 3", title: "Basic Info", subtitle: "Let's start with the essentials so we can personalise your experience." },
  { label: "Step 2 of 3", title: "Fitness Profile", subtitle: "Tell us about your fitness journey — we'll recommend the right shakes for you." },
  { label: "Step 3 of 3", title: "Body & Diet", subtitle: "Almost done! This helps us tailor nutrition suggestions to your body." },
];

export default function CompleteProfile() {
  const { notify } = useNotification();
  const [user, setUser] = useState(null);
  const [checkingUser, setCheckingUser] = useState(true);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    age: "",
    gender: "",
    fitness_goal: "",
    fitness_level: "",
    workout_type: "",
    weight: "",
    height: "",
    dietary_preference: "",
    allergies: [],
  });

  useEffect(() => {
    const getUser = async () => {
      try {
        setCheckingUser(true);
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session?.user) {
          setUser(null);
          return;
        }

        setUser(session.user);

        // Pre-fill name from OAuth metadata if available
        const meta = session.user.user_metadata;
        if (meta?.full_name || meta?.name) {
          setForm((prev) => ({
            ...prev,
            full_name: prev.full_name || meta.full_name || meta.name || "",
          }));
        }
      } catch (error) {
        console.error("Get user failed:", error);
        setUser(null);
      } finally {
        setCheckingUser(false);
      }
    };

    getUser();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const toggleAllergy = (allergy) => {
    setForm((prev) => {
      let next;

      if (allergy === "None") {
        // Selecting "None" clears all other selections
        next = prev.allergies.includes("None") ? [] : ["None"];
      } else {
        // Remove "None" if user selects a real allergy
        const withoutNone = prev.allergies.filter((a) => a !== "None");
        next = withoutNone.includes(allergy)
          ? withoutNone.filter((a) => a !== allergy)
          : [...withoutNone, allergy];
      }

      return { ...prev, allergies: next };
    });
  };

  const validateRequired = () => {
    if (!form.full_name.trim()) {
      notify("Full name is required", "error");
      return false;
    }
    if (!form.phone.trim() || form.phone.trim().length < 10) {
      notify("Enter a valid 10-digit phone number", "error");
      return false;
    }
    if (!/^[6-9]\d{9}$/.test(form.phone.trim())) {
      notify("Phone must start with 6-9 and be 10 digits", "error");
      return false;
    }
    return true;
  };

  const validateStep = () => {
    if (step === 1) {
      return validateRequired();
    }
    return true;
  };

  const nextStep = () => {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  };

  const prevStep = () => {
    setStep((s) => Math.max(s - 1, 1));
  };

  const handleSubmit = async () => {
    if (!user) {
      notify("User not found. Please login again.", "error");
      return;
    }

    // Always re-validate required fields from step 1
    if (!validateRequired()) return;

    try {
      setLoading(true);

      // Core fields (always exist in DB)
      const corePayload = {
        id: user.id,
        email: user.email,
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        role: "customer",
        fitness_goal: form.fitness_goal || null,
        fitness_level: form.fitness_level || null,
      };

      // Extended gym fields (require migration 02_gym_profile_fields.sql)
      const extendedPayload = {
        ...corePayload,
        workout_type: form.workout_type || null,
        age: form.age ? Number(form.age) : null,
        gender: form.gender || null,
        weight: form.weight ? Number(form.weight) : null,
        height: form.height ? Number(form.height) : null,
        dietary_preference: form.dietary_preference || null,
        allergies: form.allergies.length > 0 ? form.allergies : [],
      };

      // Try full payload first (includes gym fields)
      const { error } = await supabase
        .from("profiles")
        .upsert([extendedPayload], { onConflict: "id" });

      if (error) {
        console.warn("Extended profile save failed, trying core-only:", error.message);

        // Fallback: save only core fields (in case migration hasn't been run yet)
        const { error: coreError } = await supabase
          .from("profiles")
          .upsert([corePayload], { onConflict: "id" });

        if (coreError) {
          notify(coreError.message, "error");
          return;
        }
      }

      window.location.href = "/";
    } catch (error) {
      console.error("Profile save error:", error);
      notify("Could not save profile. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { error } = await supabase.from("profiles").upsert(
        [{
          id: user.id,
          email: user.email,
          full_name: form.full_name.trim() || user.user_metadata?.full_name || "NutriBlend User",
          phone: form.phone.trim() || "",
          role: "customer",
        }],
        { onConflict: "id" }
      );

      if (error) {
        notify(error.message, "error");
        return;
      }

      window.location.href = "/";
    } catch (error) {
      console.error("Skip profile error:", error);
      notify("Could not save profile.", "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Loading state ──
  if (checkingUser) {
    return (
      <div className="onboarding-wrapper">
        <div className="onboarding-card">
          <div className="onboarding-loading">
            <div className="onboarding-spinner" />
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // ── No user ──
  if (!user) {
    return (
      <div className="onboarding-wrapper">
        <div className="onboarding-card">
          <h2 className="onboarding-title">Session not found</h2>
          <p className="onboarding-subtitle">Please login again to complete your profile.</p>
          <button
            className="onboarding-btn onboarding-btn-primary"
            onClick={() => { window.location.href = "/"; }}
            style={{ width: "100%" }}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const meta = STEP_META[step - 1];

  return (
    <div className="onboarding-wrapper">
      <div className="onboarding-orb onboarding-orb-1" />
      <div className="onboarding-orb onboarding-orb-2" />

      <div className="onboarding-card">
        {/* Brand */}
        <div className="onboarding-brand">
          <span className="onboarding-brand-icon">🥤</span>
          <h1 className="onboarding-brand-title">NUTRIBLEND</h1>
        </div>

        {/* Progress bar */}
        <div className="onboarding-progress" aria-label={`Step ${step} of ${TOTAL_STEPS}`}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div
              key={i}
              className={`onboarding-progress-step${
                i + 1 === step ? " active" : ""
              }${i + 1 < step ? " completed" : ""}`}
            />
          ))}
        </div>

        {/* Step header */}
        <p className="onboarding-step-label">{meta.label}</p>
        <h2 className="onboarding-title">{meta.title}</h2>
        <p className="onboarding-subtitle">{meta.subtitle}</p>

        {/* Step 1 — Basic Info */}
        {step === 1 && (
          <div className="onboarding-form">
            <div className="onboarding-field">
              <label className="onboarding-label" htmlFor="cp-name">Full Name *</label>
              <input
                id="cp-name"
                className="onboarding-input"
                name="full_name"
                placeholder="Enter your full name"
                value={form.full_name}
                onChange={handleChange}
                autoComplete="name"
              />
            </div>

            <div className="onboarding-field">
              <label className="onboarding-label" htmlFor="cp-phone">Phone Number *</label>
              <input
                id="cp-phone"
                className="onboarding-input"
                name="phone"
                type="tel"
                placeholder="9876543210"
                maxLength="10"
                value={form.phone}
                onChange={handleChange}
                autoComplete="tel"
              />
            </div>

            <div className="onboarding-row">
              <div className="onboarding-field">
                <label className="onboarding-label" htmlFor="cp-age">Age</label>
                <input
                  id="cp-age"
                  className="onboarding-input"
                  name="age"
                  type="number"
                  placeholder="25"
                  min="13"
                  max="100"
                  value={form.age}
                  onChange={handleChange}
                />
              </div>

              <div className="onboarding-field">
                <label className="onboarding-label" htmlFor="cp-gender">Gender</label>
                <select
                  id="cp-gender"
                  className="onboarding-select"
                  name="gender"
                  value={form.gender}
                  onChange={handleChange}
                >
                  <option value="">Select</option>
                  {GENDER_OPTIONS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 2 — Fitness Profile */}
        {step === 2 && (
          <div className="onboarding-form">
            <div className="onboarding-field">
              <label className="onboarding-label" htmlFor="cp-goal">Fitness Goal</label>
              <select
                id="cp-goal"
                className="onboarding-select"
                name="fitness_goal"
                value={form.fitness_goal}
                onChange={handleChange}
              >
                <option value="">What are you training for?</option>
                {GOAL_OPTIONS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div className="onboarding-field">
              <label className="onboarding-label" htmlFor="cp-level">Fitness Level</label>
              <select
                id="cp-level"
                className="onboarding-select"
                name="fitness_level"
                value={form.fitness_level}
                onChange={handleChange}
              >
                <option value="">Where are you in your journey?</option>
                {FITNESS_LEVELS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            <div className="onboarding-field">
              <label className="onboarding-label" htmlFor="cp-workout">Workout Type</label>
              <select
                id="cp-workout"
                className="onboarding-select"
                name="workout_type"
                value={form.workout_type}
                onChange={handleChange}
              >
                <option value="">How do you train?</option>
                {WORKOUT_TYPES.map((w) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Step 3 — Body & Diet */}
        {step === 3 && (
          <div className="onboarding-form">
            <div className="onboarding-row">
              <div className="onboarding-field">
                <label className="onboarding-label" htmlFor="cp-weight">Weight</label>
                <div className="onboarding-unit" data-unit="kg">
                  <input
                    id="cp-weight"
                    className="onboarding-input"
                    name="weight"
                    type="number"
                    placeholder="70"
                    min="20"
                    max="300"
                    value={form.weight}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="onboarding-field">
                <label className="onboarding-label" htmlFor="cp-height">Height</label>
                <div className="onboarding-unit" data-unit="cm">
                  <input
                    id="cp-height"
                    className="onboarding-input"
                    name="height"
                    type="number"
                    placeholder="175"
                    min="100"
                    max="250"
                    value={form.height}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            <div className="onboarding-field">
              <label className="onboarding-label" htmlFor="cp-diet">Dietary Preference</label>
              <select
                id="cp-diet"
                className="onboarding-select"
                name="dietary_preference"
                value={form.dietary_preference}
                onChange={handleChange}
              >
                <option value="">Select your diet</option>
                {DIET_OPTIONS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="onboarding-field">
              <span className="onboarding-label">Allergies</span>
              <div className="onboarding-chips">
                {ALLERGY_OPTIONS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    className={`onboarding-chip${form.allergies.includes(a) ? " selected" : ""}`}
                    onClick={() => toggleAllergy(a)}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="onboarding-actions">
          {step > 1 && (
            <button
              type="button"
              className="onboarding-btn onboarding-btn-secondary"
              onClick={prevStep}
              disabled={loading}
            >
              ← Back
            </button>
          )}

          {step < TOTAL_STEPS ? (
            <button
              type="button"
              className="onboarding-btn onboarding-btn-primary"
              onClick={nextStep}
              disabled={loading}
            >
              Continue →
            </button>
          ) : (
            <button
              type="button"
              className="onboarding-btn onboarding-btn-primary"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? <span className="onboarding-spinner" /> : "Save & Start Ordering →"}
            </button>
          )}
        </div>

        {/* Skip option (only for steps 2 & 3 — step 1 is required) */}
        {step > 1 && (
          <button
            type="button"
            className="onboarding-skip"
            onClick={handleSkip}
            disabled={loading}
          >
            Skip for now — I'll fill this later
          </button>
        )}
      </div>
    </div>
  );
}