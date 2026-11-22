
import { auth, db } from "./firebase.js";

import {
  signInWithEmailAndPassword,
  getIdTokenResult,
  sendPasswordResetEmail,
  signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const form = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const message = document.getElementById("message");
const loginBtn = document.getElementById("loginBtn");

document.getElementById("togglePassword").addEventListener("click", () => {
  const hidden = passwordInput.type === "password";
  passwordInput.type = hidden ? "text" : "password";
  document.getElementById("togglePassword").textContent =
    hidden ? "Hide" : "Show";
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  message.textContent = "";
  loginBtn.disabled = true;

  try {
    const credential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    const user = credential.user;

    // Force refresh so newly assigned admin claims are available.
    const token = await getIdTokenResult(user, true);

    // 1. Admin account
    if (token.claims.admin === true) {
      window.location.href = "admin.html";
      return;
    }

    // All non-admin accounts must verify email.
    if (!user.emailVerified) {
      await signOut(auth);
      throw new Error("Please verify your email before logging in.");
    }

    // 2. Company account
    const companyRef = doc(db, "companies", user.uid);
    const companySnap = await getDoc(companyRef);

    if (companySnap.exists()) {
      const company = companySnap.data();

      if (company.approvalStatus !== "approved") {
        await signOut(auth);
        throw new Error("Your company account is waiting for admin approval.");
      }

      window.location.href = "company.html";
      return;
    }

    // 3. User account
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists() && userSnap.data().role === "user") {
      window.location.href = "user.html";
      return;
    }

    await signOut(auth);
    throw new Error("Account role not found. Contact ReWear admin.");

  } catch (error) {
    message.textContent = error.message;
    console.error(error);
  } finally {
    loginBtn.disabled = false;
  }
});

// Forgot password
document.getElementById("forgotPassword").addEventListener("click", async (event) => {
  event.preventDefault();

  const email = emailInput.value.trim();

  if (!email) {
    message.textContent = "Enter your email address first.";
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);
    message.textContent = "Password reset email sent.";
  } catch (error) {
    message.textContent = error.message;
  }
});
