export default function ReturnPolicy() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Return Policy</h1>
      <p className="text-sm text-gray-400 mb-8">Last updated: January 1, 2025</p>

      <div className="space-y-8 text-gray-700 text-sm leading-relaxed">

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">1. Digital Products — General Policy</h2>
          <p>
            All sales of digital products on devmarket are generally final. Because digital files can be downloaded and used immediately after purchase, we are unable to offer refunds once a product has been downloaded or a license key has been issued.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">2. Eligible Refund Situations</h2>
          <p>We will consider a refund request in the following circumstances:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>The product file is corrupted or unreadable and we are unable to provide a working replacement within 5 business days.</li>
            <li>The product is materially different from its description or preview.</li>
            <li>A duplicate charge occurred due to a technical error.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">3. How to Request a Refund</h2>
          <p>
            To request a refund, contact us at <a href="mailto:support@devmarket.com" className="text-primary hover:underline">support@devmarket.com</a> within <strong>7 days</strong> of your purchase date. Please include:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Your order ID</li>
            <li>The product name</li>
            <li>A description of the issue</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">4. Processing Time</h2>
          <p>
            Approved refunds are processed within 5–10 business days. Refunds are issued to the original payment method. Processing times may vary depending on your bank or payment provider.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">5. Non-Refundable Situations</h2>
          <p>Refunds will not be issued for:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Change of mind after download</li>
            <li>Incompatibility with third-party software not listed in the product description</li>
            <li>Requests made more than 7 days after purchase</li>
            <li>Products that have already been used in a commercial project</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">6. Contact</h2>
          <p>
            For any questions about our return policy, reach out to <a href="mailto:support@devmarket.com" className="text-primary hover:underline">support@devmarket.com</a>.
          </p>
        </section>

      </div>
    </div>
  );
}
