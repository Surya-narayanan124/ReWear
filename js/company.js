
import {
    auth,
    db,
    onAuthStateChanged,
    doc,
    getDoc,
    collection,
    getDocs,
    query,
    where,
    addDoc,
    serverTimestamp,
    signOut
} from "./firebase.js";

// ========================================
// GLOBAL VARIABLES
// ========================================

let companyUser = null;

const listings = document.getElementById("listings");
const message = document.getElementById("message");
const myRequests = document.getElementById("myRequests");

// ========================================
// DISPLAY MESSAGE
// ========================================

function showMessage(text) {

    if (!message) return;

    message.textContent = text;
    message.classList.remove("hidden");
}

// ========================================
// COMPANY AUTHENTICATION
// ========================================

onAuthStateChanged(auth, async (user) => {

    if (!user) {
        location.href = "login.html";
        return;
    }

    try {

        if (!user.emailVerified) {

            await signOut(auth);
            alert("Please verify your email.");
            location.href = "login.html";
            return;
        }

        const companyRef = doc(db, "companies", user.uid);
        const companySnap = await getDoc(companyRef);

        if (!companySnap.exists()) {

            await signOut(auth);
            alert("Company profile not found.");
            location.href = "login.html";
            return;
        }

        const companyData = companySnap.data();

        if (companyData.approvalStatus !== "approved") {

            await signOut(auth);
            alert("Your company account is not approved yet.");
            location.href = "login.html";
            return;
        }

        companyUser = user;

        await loadListings();
        await loadMyRequests();

    } catch (error) {

        console.error("Company authentication error:", error);
        showMessage("Dashboard error: " + error.message);
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
        alert("Unable to logout.");
    }
};

// ========================================
// LOAD AVAILABLE CLOTH LISTINGS
// ========================================

async function loadListings() {

    try {

        const q = query(
            collection(db, "clothes"),
            where("status", "==", "available")
        );

        const snap = await getDocs(q);

        listings.innerHTML = "";

        if (snap.empty) {

            listings.innerHTML =
                "<p>No clothes are currently available.</p>";

            return;
        }

        snap.forEach((item) => {

            const data = item.data();

            const card = document.createElement("div");
            card.className = "product";

            const title = document.createElement("h3");

            title.textContent =
                data.clothCode || item.id;

            const details = document.createElement("p");

            details.textContent =
                (data.clothName || "Old Clothes") +
                " | Condition: " +
                (data.confirmedCondition || "Not specified") +
                " | Quantity: " +
                (data.quantity || "Not specified");

            card.append(title, details);

            if (data.imageUrl) {

                const image = document.createElement("img");

                image.src = data.imageUrl;
                image.alt = "Cloth listing";
                image.style.maxWidth = "200px";
                image.style.height = "auto";

                card.appendChild(image);
            }

            const button = document.createElement("button");

            button.textContent = "Request User Details";

            button.onclick = async () => {

                try {

                    button.disabled = true;

                    // Check for an existing request
                    const existingQuery = query(
                        collection(db, "accessRequests"),
                        where("clothId", "==", item.id),
                        where("companyId", "==", companyUser.uid)
                    );

                    const existingSnap =
                        await getDocs(existingQuery);

                    if (!existingSnap.empty) {

                        showMessage(
                            "You have already requested this seller's details."
                        );

                        button.disabled = false;
                        return;
                    }

                    // Create contact request
                    await addDoc(
                        collection(db, "accessRequests"),
                        {
                            clothId: item.id,
                            clothCode: data.clothCode || item.id,
                            userId: data.userId,
                            companyId: companyUser.uid,
                            status: "pending",
                            createdAt: serverTimestamp()
                        }
                    );

                    showMessage(
                        "Contact request submitted successfully."
                    );

                    await loadMyRequests();

                } catch (error) {

                    console.error("Request error:", error);

                    showMessage(
                        "Request failed: " + error.message
                    );

                } finally {

                    button.disabled = false;
                }
            };

            card.appendChild(button);
            listings.appendChild(card);
        });

    } catch (error) {

        console.error("Loading listings error:", error);

        listings.innerHTML =
            "<p>Unable to load cloth listings: " +
            error.message + "</p>";
    }
}

// ========================================
// LOAD COMPANY REQUESTS AND SELLER DETAILS
// ========================================

async function loadMyRequests() {

    try {

        const q = query(
            collection(db, "accessRequests"),
            where("companyId", "==", companyUser.uid)
        );

        const snap = await getDocs(q);

        myRequests.innerHTML = "";

        if (snap.empty) {

            myRequests.innerHTML =
                "<p>You have not submitted any requests yet.</p>";

            return;
        }

        for (const item of snap.docs) {

            const data = item.data();

            const card = document.createElement("div");
            card.className = "product";

            // Cloth code
            const title = document.createElement("h3");

            title.textContent =
                "Cloth ID: " +
                (data.clothCode || data.clothId);

            // Request status
            const status = document.createElement("p");

            status.textContent =
                "Request Status: " + data.status;

            card.append(title, status);

            // ========================================
            // APPROVED REQUEST - GET SELLER DETAILS
            // ========================================

            if (data.status === "approved") {

                try {

                    const contactRef = doc(
                        db,
                        "contactShares",
                        item.id
                    );

                    const contactSnap =
                        await getDoc(contactRef);

                    if (contactSnap.exists()) {

                        const contact = contactSnap.data();

                        // Verify the contact belongs to this company
                        if (
                            contact.companyId !== companyUser.uid ||
                            contact.userId !== data.userId
                        ) {

                            throw new Error(
                                "Contact details do not match this request."
                            );
                        }

                        const heading =
                            document.createElement("h3");

                        heading.textContent =
                            "Seller Contact Details";

                        const name =
                            document.createElement("p");

                        name.textContent =
                            "Name: " +
                            (contact.name || "Not available");

                        const mobile =
                            document.createElement("p");

                        mobile.textContent =
                            "Mobile: " +
                            (contact.mobile || "Not available");

                        const email =
                            document.createElement("p");

                        email.textContent =
                            "Email: " +
                            (contact.email || "Not available");

                        card.append(
                            heading,
                            name,
                            mobile,
                            email
                        );

                    } else {

                        const waiting =
                            document.createElement("p");

                        waiting.textContent =
                            "Approved, but contact details are not available.";

                        card.appendChild(waiting);
                    }

                } catch (error) {

                    console.error(
                        "Contact details error:",
                        error
                    );

                    const errorText =
                        document.createElement("p");

                    errorText.textContent =
                        "Unable to retrieve seller details: " +
                        error.message;

                    card.appendChild(errorText);
                }
            }

            // Pending request
            if (data.status === "pending") {

                const pending =
                    document.createElement("p");

                pending.textContent =
                    "Waiting for seller approval.";

                card.appendChild(pending);
            }

            myRequests.appendChild(card);
        }

    } catch (error) {

        console.error("Loading requests error:", error);

        myRequests.innerHTML =
            "<p>Unable to load requests: " +
            error.message + "</p>";
    }
}
