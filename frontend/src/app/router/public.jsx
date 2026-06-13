const publicRoutes = {
  id: "public",
  children: [
    {
      path: "privacy-notice",
      lazy: async () => ({
        Component: (await import("app/pages/PrivacyNotice")).default,
      }),
    },
    {
      path: "terms-of-service",
      lazy: async () => ({
        Component: (await import("app/pages/TermsOfService")).default,
      }),
    },
  ],
};

export { publicRoutes };
