
import {
    auth,
    db,
    onAuthStateChanged,
    signOut,
    collection,
    getDocs,
    doc,
    updateDoc
} from "./firebase.js";

// Store user details so cloth listings can show their owner's information.
let userDetailsMap = new Map();

const getValue = (data, fields, fallback = "Not provided") => {
    for (const field of fields) {
        if (data[field] !== undefined && data[field] !== null &&
            String(data[field]).trim() !== "") {
            return data[field];
        }
    }
    return fallback;
};

function createText(tag, text, className = "") {
    const element = document.createElement(tag);
    element.textContent = text;
    if (className) element.className = className;
    return element;
}

function createButton(text, callback) {
    const button = document.createElement("button");
    button.textContent = text;
    button.addEventListener("click", callback);
    return button;
}

// ADMIN AUTHENTICATION
onAuthStateChanged(auth, async user => {
    if (!user) {
        location.href = "login.html";
        return;
    }

    try {
        const token = await user.getIdTokenResult(true);

        if (token.claims.admin !== true) {
            await signOut(auth);
            location.href = "login.html";
            return;
        }

        await loadAdminData();

    } catch (error) {
        console.error("Admin authentication error:", error);
        alert("Unable to verify admin access: " + error.message);
    }
});

// LOGOUT
document.getElementById("logout").onclick = async () => {
    try {
        await signOut(auth);
        location.href = "home.html";
    } catch (error) {
        alert("Logout failed: " + error.message);
    }
};

// LOAD ALL ADMIN DATA
async function loadAdminData() {
    try {
        const [userSnapshot, companySnapshot, clothSnapshot] =
            await Promise.all([
                getDocs(collection(db, "users")),
                getDocs(collection(db, "companies")),
                getDocs(collection(db, "clothes"))
            ]);

        // Store users by Firebase UID for cloth-owner lookup.
        userDetailsMap.clear();

        userSnapshot.forEach(item => {
            userDetailsMap.set(item.id, item.data());
        });

        // DASHBOARD COUNTS
        document.getElementById("totalUsers").textContent =
            userSnapshot.size;

        document.getElementById("totalCompanies").textContent =
            companySnapshot.size;

        document.getElementById("totalClothes").textContent =
            clothSnapshot.size;

        displayUsers(userSnapshot);
        displayCompanies(companySnapshot);
        displayClothes(clothSnapshot);

    } catch (error) {
        console.error("Admin data loading error:", error);
        alert("Unable to load admin data: " + error.message);
    }
}

// DISPLAY USERS
function displayUsers(snapshot) {
    const host = document.getElementById("users");
    host.replaceChildren();

    if (snapshot.empty) {
        host.appendChild(createText("p", "No users registered yet."));
        return;
    }

    snapshot.forEach(item => {
        const data = item.data();

        const card = document.createElement("div");
        card.className = "product";

        card.appendChild(createText(
            "h3",
            getValue(data, ["name", "fullName", "userName"], "User name not saved")
        ));

        card.appendChild(createText(
            "p",
            "Email: " + getValue(data, ["email", "emailAddress"])
        ));

        card.appendChild(createText(
            "p",
            "Mobile: " + getValue(data, ["mobile", "phone", "phoneNumber"])
        ));

        card.appendChild(createText(
            "p",
            "Role: " + getValue(data, ["role"], "User")
        ));

        host.appendChild(card);
    });
}

// DISPLAY COMPANIES
function displayCompanies(snapshot) {
    const host = document.getElementById("companies");
    host.replaceChildren();

    if (snapshot.empty) {
        host.appendChild(createText("p", "No companies registered yet."));
        return;
    }

    snapshot.forEach(item => {
        const data = item.data();

        const card = document.createElement("div");
        card.className = "product";

        card.appendChild(createText(
            "h3",
            getValue(data, ["companyName", "name"], "Company name not saved")
        ));

        card.appendChild(createText(
            "p",
            "Contact Person: " +
            getValue(data, ["name", "contactName"], "Not provided")
        ));

        card.appendChild(createText(
            "p",
            "Email: " + getValue(data, ["email", "emailAddress"])
        ));

        card.appendChild(createText(
            "p",
            "Mobile: " +
            getValue(data, ["mobile", "phone", "phoneNumber"])
        ));

        const status = getValue(
            data,
            ["approvalStatus"],
            "pending"
        );

        card.appendChild(createText("p", "Approval Status: " + status));

        if (status !== "approved") {
            const approve = createButton("Approve", () =>
                changeStatus(item.id, "approved")
            );

            const reject = createButton("Reject", () =>
                changeStatus(item.id, "rejected")
            );

            reject.style.marginLeft = "10px";

            card.append(approve, reject);
        }

        host.appendChild(card);
    });
}

// DISPLAY CLOTHES WITH OWNER DETAILS
function displayClothes(snapshot) {
    const host = document.getElementById("clothes");
    host.replaceChildren();

    if (snapshot.empty) {
        host.appendChild(createText("p", "No clothes uploaded yet."));
        return;
    }

    snapshot.forEach(item => {
        const data = item.data();

        const card = document.createElement("div");
        card.className = "product";

        // CLOTH DETAILS
        card.appendChild(createText(
            "h3",
            getValue(data, ["clothName", "name"], "Cloth name not saved")
        ));

        if (data.imageUrl) {
            const image = document.createElement("img");
            image.src = data.imageUrl;
            image.alt = "Cloth image";
            image.style.width = "180px";
            image.style.maxWidth = "100%";
            image.style.borderRadius = "10px";
            image.loading = "lazy";
            card.appendChild(image);
        }

        card.appendChild(createText(
            "p",
            "Condition: " +
            getValue(data, ["confirmedCondition", "condition"])
        ));

        card.appendChild(createText(
            "p",
            "AI Prediction: " +
            getValue(data, ["aiPrediction"])
        ));

        card.appendChild(createText(
            "p",
            "Category: " + getValue(data, ["category"])
        ));

        card.appendChild(createText(
            "p",
            "Material: " + getValue(data, ["material"])
        ));

        card.appendChild(createText(
            "p",
            "Quantity: " + getValue(data, ["quantity"])
        ));

        card.appendChild(createText(
            "p",
            "Description: " + getValue(data, ["description"])
        ));

        card.appendChild(createText(
            "p",
            "Status: " + getValue(data, ["status"])
        ));

        // OWNER DETAILS
        const owner = userDetailsMap.get(data.userId);

        card.appendChild(createText("h4", "Uploaded By"));

        if (owner) {
            card.appendChild(createText(
                "p",
                "Name: " +
                getValue(owner, ["name", "fullName", "userName"], "Name not saved")
            ));

            card.appendChild(createText(
                "p",
                "Email: " +
                getValue(owner, ["email", "emailAddress"])
            ));

            card.appendChild(createText(
                "p",
                "Mobile: " +
                getValue(owner, ["mobile", "phone", "phoneNumber"])
            ));
        } else {
            card.appendChild(createText(
                "p",
                "Owner profile details are unavailable."
            ));
        }

        host.appendChild(card);
    });
}

// APPROVE OR REJECT COMPANY
async function changeStatus(uid, status) {
    try {
        await updateDoc(doc(db, "companies", uid), {
            approvalStatus: status,
            reviewedAt: new Date()
        });

        alert("Company " + status + " successfully.");

        await loadAdminData();

    } catch (error) {
        console.error("Company status error:", error);
        alert("Unable to update company: " + error.message);
    }
}
