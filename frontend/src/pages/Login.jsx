import { useState } from "react";
import axios from "axios";
import "../styles/login.css";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/login`,
        { username, password },
        { withCredentials: true }
      );

      const result = response.data;

      if (result.status) {
        const { user, role } = result.data;
        localStorage.clear();
        localStorage.setItem("role", role);
        localStorage.setItem("user", user);

        if (role === "auditee") {
          navigate("/dashboard");
        } else if (role === "auditor") {
          navigate("/report");
        } else {
          setError("Authorized role not found.");
        }
      }
    } catch (err) {
      console.error("Login Error:", err);
      if (err.response && err.response.data) {
        setError(err.response.data.message || "Invalid Username or Password");
      } else {
        setError("Unable to connect to the server.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page-wrapper">
      <div className="login-container-new">
        
        {/* LEFT SIDE: ILLUSTRATION SPACE */}
        <div className="illustration-section">
             <img src="/images/loginpage.png" alt="login" className="main-img"  />
        </div>

        {/* RIGHT SIDE: FORM */}
        <div className="form-section">
          <div className="logo-space">
             {/* SPACE FOR YOUR LOGO */}
             <img src="/images/logo.png" alt="Logo" className="top-logo" />
          </div>

          <h1 className="welcome-text">Welcome!</h1>
          <p className="subtitle">Sign in to your Account</p>

          <form onSubmit={handleSubmit} className="actual-form">
            <div className="input-field">
              <span className="icon">@</span>
              <input
                type="text"
                placeholder="Username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="input-field">
              <span className="icon">🔒</span>
              <input
                type="password"
                placeholder="Password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="forgot-pass">
                <a href="#">Forgot Password?</a>
            </div>

            <div className="button-group">
              <button type="submit" className="btn-signin" disabled={isLoading}>
                {isLoading ? "LOADING..." : "SIGN IN"}
              </button>
            </div>
          </form>

          {error && <div className="error-msg">{error}</div>}

        </div>
      </div>
    </div>
  );
}