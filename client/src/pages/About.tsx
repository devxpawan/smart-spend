import React, { useState } from "react";
import { CheckCircle, Mail, Send } from "lucide-react";

const About: React.FC = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 2000));

    setIsSubmitting(false);
    setIsSubmitted(true);
    setFormData({ name: "", email: "", message: "" });

    // Reset success message after 3 seconds
    setTimeout(() => setIsSubmitted(false), 3000);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.id]: e.target.value,
    }));
  };

  const features = [
    {
      name: "Expense Tracking",
      description: "Monitor your spending with detailed analytics and categorization",
      emoji: "💰",
    },
    {
      name: "Bill Management", 
      description: "Never miss payments with smart reminders and tracking",
      emoji: "📅",
    },
    {
      name: "Warranty Tracking",
      description: "Keep track of product warranties and protection plans",
      emoji: "🛡️",
    },
    {
      name: "Profile Management",
      description: "Customize your preferences and security settings",
      emoji: "👤",
    },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Simple Header */}
      <header className="text-center py-4 flex-shrink-0 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">About SmartSpend</h1>
        <p className="text-slate-600 max-w-2xl mx-auto">
          Your trusted partner in personal finance management
        </p>
      </header>

      {/* Main Content - Scrollable */}
      <div className="flex-1 bg-white rounded-lg shadow-sm border border-slate-200 m-4 p-6 overflow-y-auto">
        <div className="space-y-8 max-w-4xl mx-auto">
          
          {/* Mission Section */}
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-4 border-b border-slate-200 pb-2">
              Our Mission
            </h2>
            <div className="space-y-4">
              <p className="text-slate-700 leading-relaxed">
                SmartSpend is a powerful personal finance management application designed to 
                simplify your financial life and empower smarter spending decisions.
              </p>
              <p className="text-slate-600">
                Whether you're tracking expenses, managing bills, or keeping tabs on warranties, 
                SmartSpend provides the tools and insights needed to achieve your financial goals with confidence.
              </p>
              <div className="bg-slate-50 rounded-lg p-4 border-l-4 border-indigo-500">
                <h3 className="font-semibold text-slate-800 mb-2">Why Choose SmartSpend?</h3>
                <ul className="text-slate-600 space-y-2 text-sm">
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    Secure and private - your data stays protected
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    Easy to use interface designed for everyone
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    Completely free with no hidden costs
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    Regular updates and improvements
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Key Features */}
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-4 border-b border-slate-200 pb-2">
              Key Features
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {features.map((feature) => (
                <div 
                  key={feature.name}
                  className="p-4 border border-slate-200 rounded-lg hover:shadow-md transition-shadow duration-200"
                >
                  <h3 className="font-semibold text-slate-800 mb-2 flex items-center">
                    <span className="text-xl mr-3" aria-hidden="true">{feature.emoji}</span>
                    {feature.name}
                  </h3>
                  <p className="text-slate-600 text-sm">{feature.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Contact Section */}
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-4 border-b border-slate-200 pb-2">
              Get in Touch
            </h2>
            
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Contact Info */}
              <div className="space-y-4">
                <p className="text-slate-700">
                  Have questions, feedback, or suggestions? We'd love to hear from you! 
                  Reach out using the form and we'll get back to you as soon as possible.
                </p>
                
                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <h4 className="font-semibold text-slate-800 text-sm flex items-center">
                      <Mail className="w-4 h-4 mr-2 text-indigo-600" />
                      Email Support
                    </h4>
                    <p className="text-slate-600 text-sm ml-6">support@smartspend.com</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <h4 className="font-semibold text-slate-800 text-sm">Response Time</h4>
                    <p className="text-slate-600 text-sm">Usually within 24 hours</p>
                  </div>
                </div>
              </div>

              {/* Contact Form */}
              <div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-2">
                      Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                      placeholder="Your name"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                      placeholder="your.email@example.com"
                    />
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-semibold text-slate-700 mb-2">
                      Message *
                    </label>
                    <textarea
                      id="message"
                      rows={4}
                      value={formData.message}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-none"
                      placeholder="Tell us what's on your mind..."
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    {isSubmitted && (
                      <div className="text-green-600 font-semibold text-sm bg-green-50 px-3 py-1 rounded-lg border border-green-200 flex items-center">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Message sent successfully!
                      </div>
                    )}
                    
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="ml-auto bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold flex items-center"
                    >
                      {isSubmitting ? (
                        "Sending..."
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Send Message
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </section>

          {/* Simple Footer */}
          <footer className="text-center py-4 border-t border-slate-200 mt-8">
            <p className="text-slate-500 text-sm">
              SmartSpend - Making personal finance management simple and effective
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default About;
