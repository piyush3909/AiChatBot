import { signInWithGoogle } from '../firebase';

export default function Login() {
  return (
    <div className="login-container">
      <h2>Welcome</h2>
      <p>Please sign in to continue</p>

      {/* This button re-uses your existing button style! */}
      <button 
        id="send-btn" 
        style={{ width: "100%" }} 
        onClick={signInWithGoogle}
      >
        Sign In With Google
      </button>
    </div>
  );
}
