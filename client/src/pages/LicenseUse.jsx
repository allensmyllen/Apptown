export default function LicenseUse() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">License Use</h1>
      <p className="text-sm text-gray-400 mb-8">Last updated: January 1, 2025</p>

      <div className="space-y-8 text-gray-700 text-sm leading-relaxed">

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">1. What You Get</h2>
          <p>
            When you purchase a product on devmarket, you receive a single-use, non-exclusive, non-transferable license to use the digital asset in accordance with the terms below. A unique license key is issued to your account as proof of purchase.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">2. Permitted Uses</h2>
          <p>Under this license, you may:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Use the product in one personal or commercial project.</li>
            <li>Modify the product to suit your project's needs.</li>
            <li>Use the product in a project delivered to a single end client.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">3. Prohibited Uses</h2>
          <p>You may not:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Redistribute, resell, sublicense, or share the product files with any third party.</li>
            <li>Use the product in more than one project without purchasing additional licenses.</li>
            <li>Include the product in a template, theme, or product that is itself sold or distributed.</li>
            <li>Remove or alter any copyright, trademark, or attribution notices included in the product.</li>
            <li>Use the product in any way that violates applicable laws or regulations.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">4. License Key</h2>
          <p>
            Your license key (format: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">DM-XXXXXXXX-XXXXXXXX-XXXXXXXX</code>) is tied to your account and the specific product purchased. Keep it safe — it serves as your proof of ownership. Do not share your license key with others.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">5. Multiple Projects</h2>
          <p>
            If you need to use the same product across multiple projects or for multiple clients, you must purchase a separate license for each use. Contact us at <a href="mailto:support@devmarket.com" className="text-green-600 hover:underline">support@devmarket.com</a> for bulk or extended licensing options.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">6. Ownership</h2>
          <p>
            This license does not transfer ownership of the product. The original author retains all intellectual property rights. You are purchasing a right to use the product, not the product itself.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">7. Termination</h2>
          <p>
            This license is effective until terminated. It will terminate automatically if you fail to comply with any of its terms. Upon termination, you must destroy all copies of the product in your possession.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">8. Contact</h2>
          <p>
            Questions about licensing? Reach out at <a href="mailto:support@devmarket.com" className="text-green-600 hover:underline">support@devmarket.com</a>.
          </p>
        </section>

      </div>
    </div>
  );
}
