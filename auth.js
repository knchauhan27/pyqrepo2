// Authentication Handler

// Get DOM elements
const authModal = document.getElementById("auth-modal");
const signInBtn = document.getElementById("sign-in-btn");
const closeAuthModalBtn = document.getElementById("close-auth-modal");
const signInForm = document.getElementById("sign-in-form");
const signUpForm = document.getElementById("sign-up-form");
const switchToSignupBtn = document.getElementById("switch-to-signup");
const switchToSigninBtn = document.getElementById("switch-to-signin");

// Sign In form elements
const googleSigninBtn = document.getElementById("google-signin-btn");
const signinEmail = document.getElementById("signin-email");
const signinPassword = document.getElementById("signin-password");
const signinSubmitBtn = document.getElementById("signin-submit");

// Sign Up form elements
const googleSignupBtn = document.getElementById("google-signup-btn");
const signupName = document.getElementById("signup-name");
const signupEmail = document.getElementById("signup-email");
const signupPassword = document.getElementById("signup-password");
const signupSubmitBtn = document.getElementById("signup-submit");

// ===========================
// MODAL CONTROLS
// ===========================

// Open auth modal
signInBtn.addEventListener("click", () => {
  authModal.classList.add("active");
});

// Close auth modal
closeAuthModalBtn.addEventListener("click", () => {
  authModal.classList.remove("active");
});

// Close modal when clicking outside
authModal.addEventListener("click", (e) => {
  if (e.target === authModal) {
    authModal.classList.remove("active");
  }
});

// Switch between Sign In and Sign Up
switchToSignupBtn.addEventListener("click", () => {
  signInForm.classList.remove("active");
  signUpForm.classList.add("active");
});

switchToSigninBtn.addEventListener("click", () => {
  signUpForm.classList.remove("active");
  signInForm.classList.add("active");
});

// ===========================
// AUTHENTICATION FUNCTIONS
// ===========================

// Sign In with Email
signinSubmitBtn.addEventListener("click", async () => {
  const email = signinEmail.value.trim();
  const password = signinPassword.value;

  if (!email || !password) {
    alert("Please fill in all fields");
    return;
  }

  try {
    signinSubmitBtn.disabled = true;
    signinSubmitBtn.textContent = "Signing in...";

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      alert("Error: " + error.message);
      return;
    }

    // Success! Close modal and redirect
    authModal.classList.remove("active");
    alert("Signed in successfully!");
    // Optionally redirect to dashboard or another page
    // window.location.href = 'dashboard.html';
  } catch (error) {
    alert("Error signing in: " + error.message);
  } finally {
    signinSubmitBtn.disabled = false;
    signinSubmitBtn.textContent = "Sign In";
  }
});

// Sign Up with Email
signupSubmitBtn.addEventListener("click", async () => {
  const name = signupName.value.trim();
  const email = signupEmail.value.trim();
  const password = signupPassword.value;

  if (!name || !email || !password) {
    alert("Please fill in all fields");
    return;
  }

  if (password.length < 6) {
    alert("Password must be at least 6 characters");
    return;
  }

  try {
    signupSubmitBtn.disabled = true;
    signupSubmitBtn.textContent = "Creating account...";

    // Sign up with email
    const { data, error } = await supabaseClient.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          full_name: name,
        },
        emailRedirectTo: `${window.location.origin}`,
      },
    });

    if (error) {
      alert("Error: " + error.message);
      return;
    }

    // Success!
    alert("Account created! Check your email to verify your account.");
    signUpForm.classList.remove("active");
    signInForm.classList.add("active");

    // Clear form
    signupName.value = "";
    signupEmail.value = "";
    signupPassword.value = "";
  } catch (error) {
    alert("Error creating account: " + error.message);
  } finally {
    signupSubmitBtn.disabled = false;
    signupSubmitBtn.textContent = "Create Account";
  }
});

// ===========================
// GOOGLE AUTHENTICATION
// ===========================

// Google Sign In
googleSigninBtn.addEventListener("click", async () => {
  try {
    const { data, error } = await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}`,
        scopes: "profile email",
      },
    });

    if (error) {
      alert("Error signing in with Google: " + error.message);
    }
  } catch (error) {
    alert("Error: " + error.message);
  }
});

// Google Sign Up
googleSignupBtn.addEventListener("click", async () => {
  try {
    const { data, error } = await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}`,
        scopes: "profile email",
      },
    });

    if (error) {
      alert("Error signing up with Google: " + error.message);
    }
  } catch (error) {
    alert("Error: " + error.message);
  }
});

// ===========================
// CHECK AUTHENTICATION STATUS
// ===========================

// Check if user is already signed in
window.addEventListener("load", async () => {
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  if (session) {
    // User is signed in
    const user = session.user;
    console.log("User is signed in:", user);

    // Update UI to show user is authenticated
    signInBtn.textContent = user.email || "Account";
    signInBtn.style.background = "var(--accent-blue)";
  } else {
    console.log("User is not signed in");
  }
});

// Listen for auth changes
supabaseClient.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_IN") {
    console.log("User signed in");
    const user = session.user;
    signInBtn.textContent = user.email || "Account";
    signInBtn.style.background = "var(--accent-blue)";
  } else if (event === "SIGNED_OUT") {
    console.log("User signed out");
    signInBtn.textContent = "Sign In";
    signInBtn.style.background = "";
  }
});
