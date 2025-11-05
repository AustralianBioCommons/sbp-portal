module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        biocommons: {
          // Primary Colors
          "primary-pink": "#ed087c",
          "primary-orange": "#f49f1d",
          "primary-teal": "#5ac3b1",
          // Secondary Colors
          black: "#000000",
          white: "#ffffff",
          // Additional Brand Colors
          "secondary-purple": "#b21e8d",
          "secondary-blue": "#205a86",
          "secondary-green": "#8ea869",
          "secondary-mint": "#2cb77c"
        },
        // Functional Colors
        text: {
          primary: "#000000",
          secondary: "#4a5568",
          muted: "#718096",
          light: "#a0aec0"
        },
        bg: {
          primary: "#ffffff",
          secondary: "#f7fafc",
          accent: "#F0F0F0"
        },
        border: {
          light: "#e2e8f0",
          medium: "#cbd5e0",
          dark: "#8c9aacff"
        },
        // State Colors
        success: "#2cb77c",
        warning: "#f49f1d",
        error: "#ed087c",
        focus: "#5ac3b1"
      },
      borderRadius: {
        "DEFAULT-10": "10px"
      },
      borderWidth: {
        '3': '3px'
      }
    }
  },
  plugins: []
};
