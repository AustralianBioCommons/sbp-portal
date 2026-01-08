module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        // Functional Colors
        text: {
          primary: "#000000",
          secondary: "#4a5568",
          muted: "#718096",
          light: "#a0aec0",
        },
        bg: {
          primary: "#ffffff",
          secondary: "#f7fafc",
          accent: "#F0F0F0",
        },
        border: {
          light: "#e2e8f0",
          medium: "#cbd5e0",
          dark: "#8c9aacff",
        },
        success: "#10b981",
        error: "#ef4444",
      },
      borderRadius: {
        "DEFAULT-10": "10px",
      },
      borderWidth: {
        3: "3px",
      },
    },
  },
  plugins: [],
};
