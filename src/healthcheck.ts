function main() {
  fetch("http://localhost:3000/health")
    .then((r) => {
      if (r.status !== 200) {
        throw new Error("Health check failed");
      }
      if (!r.ok) {
        throw new Error("Health check failed");
      }
      process.exit(0);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
main()
