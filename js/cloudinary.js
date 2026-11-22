
const CLOUD_NAME = "jrx733wn";
const UPLOAD_PRESET = "rewear_upload";

export async function uploadClothImage(file) {

    if (!file || !file.type.startsWith("image/")) {
        throw new Error("Please select an image.");
    }

    if (file.size > 5 * 1024 * 1024) {
        throw new Error("Maximum image size is 5 MB.");
    }

    const data = new FormData();

    data.append("file", file);
    data.append("upload_preset", UPLOAD_PRESET);

    const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        {
            method: "POST",
            body: data
        }
    );

    if (!response.ok) {
        throw new Error("Cloudinary upload failed.");
    }

    const result = await response.json();

    return result.secure_url;
}
