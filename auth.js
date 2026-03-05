// Authentication Handler

// Function to initialize auth after DOM is loaded
function initializeAuth() {
  // Get DOM elements
  const authModal = document.getElementById("auth-modal");
  const signInBtn = document.getElementById("sign-in-btn");
  const userMenu = document.getElementById("user-menu");
  const userEmail = document.getElementById("user-email");
  const logoutBtn = document.getElementById("logout-btn");
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

  // Check if required elements exist
  if (!authModal || !signInBtn) {
    console.error("Auth modal or sign-in button not found");
    return;
  }

  console.log("Auth initialized successfully");

  // ===========================
  // MODAL CONTROLS
  // ===========================

  // Open auth modal
  signInBtn.addEventListener("click", () => {
    console.log("Sign In button clicked");
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

      // Clear form fields
      signinEmail.value = "";
      signinPassword.value = "";

      // Check if there's a redirect URL stored
      const redirectUrl = sessionStorage.getItem("redirectAfterLogin");
      if (redirectUrl) {
        sessionStorage.removeItem("redirectAfterLogin");
        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 500);
      } else {
        alert("Signed in successfully!");
      }
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
  // LOGOUT HANDLER
  // ===========================

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        logoutBtn.disabled = true;
        logoutBtn.textContent = "Signing out...";

        const { error } = await supabaseClient.auth.signOut();

        if (error) {
          alert("Error signing out: " + error.message);
          return;
        }

        // Clear session storage
        sessionStorage.removeItem("redirectAfterLogin");
        sessionStorage.removeItem("openAuthModal");

        // Reset UI
        signInBtn.style.display = "block";
        userMenu.classList.add("hidden");
        signInBtn.textContent = "Sign In";
        signInBtn.style.background = "";

        // Clear form fields
        signinEmail.value = "";
        signinPassword.value = "";

        alert("Signed out successfully!");
      } catch (error) {
        alert("Error: " + error.message);
      } finally {
        logoutBtn.disabled = false;
        logoutBtn.textContent = "Sign Out";
      }
    });
  }

  // ===========================
  // CHECK AUTHENTICATION STATUS
  // ===========================

  // Check if user is already signed in
  async function checkAuthStatus() {
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();

    if (session) {
      // User is signed in
      const user = session.user;
      console.log("User is signed in:", user);

      // Update UI to show user is authenticated
      signInBtn.style.display = "none";
      userMenu.classList.remove("hidden");
      userEmail.textContent = user.email || "Account";
    } else {
      console.log("User is not signed in");
      signInBtn.style.display = "block";
      userMenu.classList.add("hidden");
    }

    // Check if we need to open the auth modal due to access restriction
    if (sessionStorage.getItem("openAuthModal") === "true") {
      sessionStorage.removeItem("openAuthModal");
      if (!session) {
        // Only show modal if not logged in
        authModal.classList.add("active");
      }
    }

    // Check if there's a page to redirect to after login (from a protected page)
    const redirectUrl = sessionStorage.getItem("redirectAfterLogin");
    if (redirectUrl && session) {
      sessionStorage.removeItem("redirectAfterLogin");
      window.location.href = redirectUrl;
    }
  }

  checkAuthStatus();

  // Listen for auth changes
  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_IN") {
      console.log("User signed in");
      const user = session.user;
      signInBtn.style.display = "none";
      userMenu.classList.remove("hidden");
      userEmail.textContent = user.email || "Account";
    } else if (event === "SIGNED_OUT") {
      console.log("User signed out");
      signInBtn.style.display = "block";
      userMenu.classList.add("hidden");
      signInBtn.textContent = "Sign In";
      signInBtn.style.background = "";
    }
  });
}

// Initialize auth when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeAuth);
} else {
  initializeAuth();
}
