
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  getIdTokenResult,
  signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import {
  setDoc,
  getDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

import { auth, db } from "./firebase.js";

// ========================================
// REGISTRATION
// ========================================

const registerForm = document.getElementById("registerForm");

if (registerForm) {
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const message = document.getElementById("message");

    const role = document.getElementById("role").value;
    const name = document.getElementById("name").value.trim();
    const mobile = document.getElementById("mobile").value.trim();
    const email = document.getElementById("email").value.trim().toLowerCase();

    const password = document.getElementById("password").value;
    const confirmPassword =
      document.getElementById("confirmPassword").value;

    const companyName =
      document.getElementById("companyName")?.value.trim() || "";

    try {
      if (password !== confirmPassword) {
        throw new Error("Passwords do not match.");
      }

      if (!name || !mobile || !email) {
        throw new Error("Please complete all required fields.");
      }

      if (!["user", "company"].includes(role)) {
        throw new Error("Invalid account type.");
      }

      if (role === "company" && !companyName) {
        throw new Error("Enter your company name.");
      }

      message.classList.remove("hidden");
      message.textContent = "Creating your account...";

      // 1. Create Firebase Authentication account
      const credential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const newUser = credential.user;

      // 2. Save the matching Firestore document
      if (role === "user") {
        await setDoc(doc(db, "users", newUser.uid), {
          uid: newUser.uid,
          name,
          mobile,
          email,
          role: "user",
          createdAt: serverTimestamp()
        });
      } else {
        await setDoc(doc(db, "companies", newUser.uid), {
          uid: newUser.uid,
          name,
          companyName,
          mobile,
          email,
          role: "company",
          approvalStatus: "pending",
          createdAt: serverTimestamp()
        });
      }

      // 3. Send verification email
      await sendEmailVerification(newUser);

      message.textContent =
        "Account created successfully! Please verify your email. " +
        (role === "company"
          ? "Your company account is pending admin approval."
          : "");

      registerForm.reset();

    } catch (error) {
      console.error(
        "Registration error:",
        error.code || "",
        error.message
      );

      message.classList.remove("hidden");
      message.textContent = "Registration failed: " + error.message;
    }
  });
}

// ========================================
// LOGIN - USER / COMPANY / ADMIN
// ========================================

export async function loginUser(email, password) {
  try {
    email = email.trim().toLowerCase();

    const credential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    const user = credential.user;

    // 1. Admin custom claim check
    const tokenResult = await getIdTokenResult(user, true);

    if (tokenResult.claims.admin === true) {
      window.location.href = "admin.html";
      return;
    }

    // 2. Email verification check
    if (!user.emailVerified) {
      await signOut(auth);

      throw new Error(
        "Please verify your email. Check your inbox and spam folder."
      );
    }

    // 3. Company account check
    const companyRef = doc(db, "companies", user.uid);
    const companySnap = await getDoc(companyRef);

    if (companySnap.exists()) {
      const company = companySnap.data();

      if (company.approvalStatus !== "approved") {
        await signOut(auth);

        throw new Error(
          "Your company account is waiting for admin approval."
        );
      }

      window.location.href = "company.html";
      return;
    }

    // 4. User account check
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists() && userSnap.data().role === "user") {
      window.location.href = "user.html";
      return;
    }

    await signOut(auth);

    throw new Error(
      "Account profile not found. Please contact ReWear admin."
    );

  } catch (error) {
    console.error(
      "Login error:",
      error.code || "",
      error.message
    );

    alert(error.message);
  }
}
