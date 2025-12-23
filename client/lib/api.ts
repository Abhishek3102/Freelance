export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = {
    postJob: async (data: any, clientAddress: string) => {
        const response = await fetch(`${API_URL}/jobs/post/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...data, client_address: clientAddress }),
        });
        if (!response.ok) throw new Error("Failed to post job");
        return response.json();
    },

    // Add other endpoints as needed
};
