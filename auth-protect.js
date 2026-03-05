// Authentication Protection for Protected Pages
// This script checks if user is logged in before allowing access to protected pages

async function checkAuthAndProtect() {
  // Make sure Supabase is loaded
  if (typeof supabaseClient === "undefined") {
    console.error("Supabase client not initialized");
    return;
  }

  try {
    // Check if user has an active session
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();

    if (!session) {
      // User is not authenticated
      console.log("User not authenticated. Redirecting to login...");

      // Store the current page so we can redirect back after login
      const currentSubject = new URLSearchParams(window.location.search).get(
        "name",
      );
      if (currentSubject) {
        sessionStorage.setItem(
          "redirectAfterLogin",
          `subject.html?name=${encodeURIComponent(currentSubject)}`,
        );
      }

      // Redirect to home page with a flag to open sign-in modal
      sessionStorage.setItem("openAuthModal", "true");
      window.location.href = "index.html";
      return;
    }

    // User is authenticated - allow access
    console.log("User authenticated. Access granted.");
    const user = session.user;

    // Could add user info to UI if needed
    console.log("Logged in as:", user.email);
  } catch (error) {
    console.error("Error checking authentication:", error);
    // If there's an error, redirect to home for safety
    window.location.href = "index.html";
  }
}

// Run the check when page loads
document.addEventListener("DOMContentLoaded", checkAuthAndProtect);

// Also check on page visibility change (in case session expires)
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    checkAuthAndProtect();
  }
});
