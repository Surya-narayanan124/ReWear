
import {
    auth,
    db,
    onAuthStateChanged,
    collection,
    addDoc,
    getDocs,
    doc,
    query,
    where,
    updateDoc,
    getDoc,
    serverTimestamp,
    signOut
} from "./firebase.js";

import {
    setDoc
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

import {
    analyzeCloth,
    getRecommendation
} from "./ai.js";

import {
    uploadClothImage
} from "./cloudinary.js";

// ========================================
// GLOBAL VARIABLES
// ========================================

const imageInput = document.getElementById("clothImage");
const preview = document.getElementById("imagePreview");

let currentUser = null;
let selectedFile = null;
let aiPrediction = null;

const message = document.getElementById("aiResult");

// ========================================
// DISPLAY MESSAGE
// ========================================

function showMessage(text) {
    if (!message) return;

    message.textContent = text;
    message.classList.remove("hidden");
}

// ========================================
// USER AUTHENTICATION
// ========================================

onAuthStateChanged(auth, async user => {

    if (!user) {
        location.href = "login.html";
        return;
    }

    try {

        currentUser = user;

        const snap = await getDoc(
            doc(db, "users", user.uid)
        );

        if (!snap.exists() || snap.data().role !== "user") {

            await signOut(auth);
            location.href = "login.html";
            return;
        }

        document.getElementById("welcome").textContent =
            "Welcome, " + (snap.data().name || "User");

        await loadMyClothes();
        await loadRequests();

    } catch (error) {

        console.error("User authentication error:", error);
        showMessage("Unable to load your dashboard: " + error.message);
    }
});

// ========================================
// LOGOUT
// ========================================

document.getElementById("logout").onclick = async () => {

    try {
        await signOut(auth);
        location.href = "home.html";

    } catch (error) {
        console.error("Logout error:", error);
        alert("Unable to logout. Please try again.");
    }
};

// ========================================
// IMAGE PREVIEW
// ========================================

imageInput.addEventListener("change", () => {

    selectedFile = imageInput.files[0];

    if (!selectedFile) return;

    preview.src = URL.createObjectURL(selectedFile);
    preview.style.display = "block";

    aiPrediction = null;

    document.getElementById("confirmSection")
        .classList.add("hidden");
});

// ========================================
// AI CLOTH ANALYSIS
// ========================================

document.getElementById("analyzeBtn").onclick =
async () => {

    try {

        if (!selectedFile) {
            throw new Error("Upload a cloth image first.");
        }

        showMessage("AI is analyzing your image...");

        const result = await analyzeCloth(preview);

        aiPrediction = result.prediction;

        document.getElementById("prediction").textContent =
            result.prediction + " (" +
            (result.confidence * 100).toFixed(1) + "%)";

        document.getElementById("confirmedCondition").value =
            result.prediction.toLowerCase();

        document.getElementById("confirmSection")
            .classList.remove("hidden");

        showMessage(
            "AI analysis completed. Please confirm the actual condition."
        );

    } catch (error) {

        console.error("AI analysis error:", error);
        showMessage(error.message);
    }
};

// ========================================
// SAVE CLOTH LISTING
// ========================================

document.getElementById("saveCloth").onclick =
async () => {

    try {

        if (!currentUser) {
            throw new Error("Please sign in.");
        }

        if (!selectedFile) {
            throw new Error("Upload a cloth image.");
        }

        if (!aiPrediction) {
            throw new Error("Please analyze the cloth image first.");
        }

        const name =
            document.getElementById("clothName").value.trim();

        const quantity =
            Number(document.getElementById("quantity").value);

        if (!name || !Number.isInteger(quantity) || quantity < 1) {
            throw new Error("Enter a valid cloth name and quantity.");
        }

        const condition =
            document.getElementById("confirmedCondition").value;

        if (!["good", "average", "damaged"].includes(condition)) {
            throw new Error("Please confirm the cloth condition.");
        }

        const recommendations = getRecommendation(condition);

        showMessage("Uploading your cloth image...");

        const imageUrl = await uploadClothImage(selectedFile);

        const ref = await addDoc(
            collection(db, "clothes"),
            {

                userId: currentUser.uid,
                imageUrl,

                clothName: name,

                category:
                    document.getElementById("category").value,

                material:
                    document.getElementById("material").value,

                quantity,

                description:
                    document.getElementById("description").value,

                aiPrediction,
                confirmedCondition: condition,
                recommendations,

                selectedAction: "",
                status: "available",
                createdAt: serverTimestamp()

            }
        );

        await updateDoc(ref, {
            clothCode: "RW-" + ref.id
        });

        document.getElementById("recommendations").innerHTML =
            "<h3>Recommended Options</h3><p>" +
            recommendations.join(" • ") + "</p>";

        showMessage(
            "Cloth uploaded successfully! ID: RW-" + ref.id
        );

        document.getElementById("clothForm").reset();

        document.getElementById("confirmSection")
            .classList.add("hidden");

        preview.style.display = "none";

        selectedFile = null;
        aiPrediction = null;

        await loadMyClothes();

    } catch (error) {

        console.error("Save cloth error:", error);
        showMessage(error.message);
    }
};

// ========================================
// LOAD MY CLOTH LISTINGS
// ========================================

async function loadMyClothes() {

    if (!currentUser) return;

    try {

        const q = query(
            collection(db, "clothes"),
            where("userId", "==", currentUser.uid)
        );

        const snap = await getDocs(q);

        const host = document.getElementById("myClothes");

        host.innerHTML = "";

        if (snap.empty) {
            host.innerHTML = "<p>You have not uploaded any clothes yet.</p>";
            return;
        }

        snap.forEach(item => {

            const data = item.data();

            const div = document.createElement("div");
            div.className = "product";

            const title = document.createElement("h3");

            title.textContent =
                data.clothCode || item.id;

            const details = document.createElement("p");

            details.textContent =
                (data.clothName || "Cloth") + " | " +
                (data.confirmedCondition || "Unknown") +
                " | Quantity: " + data.quantity;

            const image = document.createElement("img");

            image.src = data.imageUrl;
            image.alt = "Uploaded cloth";
            image.style.maxWidth = "200px";

            div.append(title, details, image);

            host.appendChild(div);
        });

    } catch (error) {

        console.error("Loading clothes error:", error);

        document.getElementById("myClothes").textContent =
            "Unable to load your clothes.";
    }
}

// ========================================
// LOAD COMPANY CONTACT REQUESTS
// ========================================

async function loadRequests() {

    if (!currentUser) return;

    try {

        const q = query(
            collection(db, "accessRequests"),
            where("userId", "==", currentUser.uid)
        );

        const snap = await getDocs(q);

        const host = document.getElementById("requests");

        host.innerHTML = "";

        if (snap.empty) {
            host.innerHTML =
                "<p>No company contact requests yet.</p>";
            return;
        }

        for (const item of snap.docs) {

            const data = item.data();

            const div = document.createElement("div");
            div.className = "product";

            const title = document.createElement("h3");

            title.textContent =
                "Cloth ID: " + (data.clothCode || data.clothId);

            const status = document.createElement("p");

            status.textContent =
                "Status: " + data.status;

            div.append(title, status);

            // ========================================
            // USER APPROVES CONTACT REQUEST
            // ========================================

            if (data.status === "pending") {

                const allow = document.createElement("button");

                allow.textContent = "Allow Contact Details";

                allow.onclick = async () => {

                    try {

                        const confirmed = confirm(
                            "Do you want to share your name, mobile number and email with this company?"
                        );

                        if (!confirmed) return;

                        allow.disabled = true;
                        allow.textContent = "Sharing...";

                        // Verify the request still exists.
                        const requestRef = doc(
                            db,
                            "accessRequests",
                            item.id
                        );

                        const latestRequest =
                            await getDoc(requestRef);

                        if (!latestRequest.exists()) {
                            throw new Error("Contact request not found.");
                        }

                        const requestData = latestRequest.data();

                        if (
                            requestData.userId !== currentUser.uid ||
                            requestData.status !== "pending"
                        ) {
                            throw new Error(
                                "This request is no longer pending."
                            );
                        }

                        // Get the user's own profile.
                        const profileSnap = await getDoc(
                            doc(db, "users", currentUser.uid)
                        );

                        if (!profileSnap.exists()) {
                            throw new Error("User profile not found.");
                        }

                        const profile = profileSnap.data();

                        if (!profile.mobile || !profile.email) {
                            throw new Error(
                                "Your mobile number or email is missing from your profile."
                            );
                        }

                        // Create a private contact-sharing document.
                        // The company must only be allowed to read this
                        // document through restrictive Firestore rules.

                        await setDoc(
                            doc(db, "contactShares", item.id),
                            {
                                requestId: item.id,
                                clothId: requestData.clothId,
                                userId: currentUser.uid,
                                companyId: requestData.companyId,

                                name: profile.name || "",
                                mobile: profile.mobile,
                                email: profile.email,

                                createdAt: serverTimestamp()
                            }
                        );

                        // Mark the request as approved.
                        await updateDoc(requestRef, {
                            status: "approved",
                            approvedAt: serverTimestamp()
                        });

                        alert(
                            "Contact details approved for this company."
                        );

                        await loadRequests();

                    } catch (error) {

                        console.error(
                            "Contact approval error:",
                            error
                        );

                        alert(
                            "Unable to share contact details: " +
                            error.message
                        );

                        allow.disabled = false;
                        allow.textContent = "Allow Contact Details";
                    }
                };

                div.appendChild(allow);
            }

            if (data.status === "approved") {

                const approved = document.createElement("p");

                approved.textContent =
                    "You approved sharing your contact details with this company.";

                div.appendChild(approved);
            }

            host.appendChild(div);
        }

    } catch (error) {

        console.error("Loading requests error:", error);

        document.getElementById("requests").textContent =
            "Unable to load contact requests.";
    }
}
