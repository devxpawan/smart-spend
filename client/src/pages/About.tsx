import React from "react";
import {
  CheckCircle,
  Users,
  Shield,
  TrendingUp,
  Award,
  Mail,
  Send,
} from "lucide-react";

const Contact: React.FC = () => {
  const [result, setResult] = React.useState("");

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResult("Sending....");
    const formData = new FormData(event.target as HTMLFormElement);

    formData.append(
      "access_key",
      import.meta.env.VITE_WEB3FORMS_ACCESS_KEY
    );

    const response = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      setResult("Form Submitted Successfully");
      (event.target as HTMLFormElement).reset();
    } else {
      console.log("Error", data);
      setResult(data.message);
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg p-4 sm:p-6 lg:p-8 border border-indigo-200">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6 sm:mb-8">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
            <Mail className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2">
            Contact Developers
          </h3>
          <p className="text-sm sm:text-base text-slate-600">
            Have questions, suggestions, or feedback? We'd love to hear
            from you!
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 sm:space-y-6">
          <div>
            <label
              htmlFor="name"
              className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5 sm:mb-2"
            >
              Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-white text-sm sm:text-base"
              placeholder="Your full name"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5 sm:mb-2"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-white text-sm sm:text-base"
              placeholder="your.email@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="message"
              className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5 sm:mb-2"
            >
              Message
            </label>
            <textarea
              id="message"
              name="message"
              required
              rows={4}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-white resize-none text-sm sm:text-base"
              placeholder="Tell us about your experience, suggestions, or any issues you've encountered..."
            />
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] flex items-center justify-center text-sm sm:text-base min-h-[44px]"
          >
            <Send className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Send Message
          </button>
        </form>

        {result && (
          <div
            className={`mt-6 p-4 rounded-lg text-center font-medium ${
              result === "Form Submitted Successfully"
                ? "bg-green-100 text-green-800 border border-green-200"
                : result === "Sending...."
                ? "bg-blue-100 text-blue-800 border border-blue-200"
                : "bg-red-100 text-red-800 border border-red-200"
            }`}
          >
            {result}
          </div>
        )}
      </div>
    </div>
  );
};

const About: React.FC = () => {
  const features = [
    {
      name: "Expense Tracking",
      description:
        "Monitor your spending with detailed analytics and categorization",
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
      {/* Mobile-optimized Header */}
      <header className="text-center py-4 sm:py-6 lg:py-8 flex-shrink-0 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-blue-50">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2 sm:mb-3 px-4">
          About SmartSpend
        </h1>
        <p className="text-sm sm:text-base lg:text-lg text-slate-600 max-w-3xl mx-auto px-4">
          Empowering individuals to take control of their financial future
          with intelligent tools and insights
        </p>
      </header>

      {/* Main Content - Mobile optimized scrollable */}
      <div className="flex-1 bg-white rounded-lg shadow-sm border border-slate-200 m-2 sm:m-4 p-3 sm:p-4 lg:p-6 overflow-y-auto">
        <div className="space-y-6 sm:space-y-8 max-w-4xl mx-auto">
          {/* Mission Section - Mobile optimized */}
          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-slate-800 mb-3 sm:mb-4 border-b border-slate-200 pb-2">
              Our Mission
            </h2>
            <div className="space-y-4 sm:space-y-6">
              <p className="text-slate-700 leading-relaxed text-base sm:text-lg">
                At SmartSpend, we believe that everyone deserves access to
                powerful financial tools that make managing money simple,
                secure, and stress-free.
              </p>
              <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
                Our mission is to democratize personal finance management
                by providing an intuitive, comprehensive platform that
                helps individuals track expenses, manage bills, monitor
                warranties, and make informed financial decisions. We're
                committed to building technology that empowers users to
                achieve their financial goals with confidence and clarity.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg p-4 sm:p-6 border border-indigo-200">
                  <h3 className="font-semibold text-slate-800 mb-2 sm:mb-3 flex items-center text-sm sm:text-base">
                    <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 mr-2" />
                    Our Values
                  </h3>
                  <ul className="text-slate-600 space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                    <li className="flex items-center">
                      <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 mr-2 flex-shrink-0" />
                      Privacy and security first
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 mr-2 flex-shrink-0" />
                      User-centric design
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 mr-2 flex-shrink-0" />
                      Transparency and trust
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 mr-2 flex-shrink-0" />
                      Continuous innovation
                    </li>
                  </ul>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 sm:p-6 border border-green-200">
                  <h3 className="font-semibold text-slate-800 mb-2 sm:mb-3 flex items-center text-sm sm:text-base">
                    <Award className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 mr-2" />
                    Why Choose SmartSpend?
                  </h3>
                  <ul className="text-slate-600 space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                    <li className="flex items-center">
                      <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 mr-2 flex-shrink-0" />
                      100% free with no hidden costs
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 mr-2 flex-shrink-0" />
                      Bank-level security
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 mr-2 flex-shrink-0" />
                      Cross-platform compatibility
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 mr-2 flex-shrink-0" />
                      Regular feature updates
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Key Features - Mobile optimized */}
          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-slate-800 mb-3 sm:mb-4 border-b border-slate-200 pb-2">
              Key Features
            </h2>
            <p className="text-slate-600 mb-4 sm:mb-6 text-sm sm:text-base">
              Discover the powerful tools that make SmartSpend your
              ultimate financial companion
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {features.map((feature) => (
                <div
                  key={feature.name}
                  className="p-4 sm:p-6 border border-slate-200 rounded-lg hover:shadow-lg hover:border-indigo-300 transition-all duration-300 bg-gradient-to-br from-white to-slate-50"
                >
                  <h3 className="font-semibold text-slate-800 mb-2 sm:mb-3 flex items-center text-sm sm:text-base">
                    <span
                      className="text-xl sm:text-2xl mr-2 sm:mr-3"
                      aria-hidden="true"
                    >
                      {feature.emoji}
                    </span>
                    {feature.name}
                  </h3>
                  <p className="text-slate-600 leading-relaxed text-xs sm:text-sm">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Technology & Security - Mobile optimized */}
          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-slate-800 mb-3 sm:mb-4 border-b border-slate-200 pb-2">
              Technology & Security
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="text-center p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <h3 className="font-semibold text-slate-800 mb-2 text-sm sm:text-base">
                  Secure by Design
                </h3>
                <p className="text-slate-600 text-xs sm:text-sm">
                  End-to-end encryption and secure data storage ensure your
                  financial information stays private
                </p>
              </div>

              <div className="text-center p-4 sm:p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <h3 className="font-semibold text-slate-800 mb-2 text-sm sm:text-base">
                  Smart Analytics
                </h3>
                <p className="text-slate-600 text-xs sm:text-sm">
                  Advanced algorithms provide insights and trends to help
                  you make better financial decisions
                </p>
              </div>

              <div className="text-center p-4 sm:p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200 sm:col-span-2 lg:col-span-1">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <h3 className="font-semibold text-slate-800 mb-2 text-sm sm:text-base">
                  User-Focused
                </h3>
                <p className="text-slate-600 text-xs sm:text-sm">
                  Built with user feedback and designed for simplicity
                  without compromising functionality
                </p>
              </div>
            </div>
          </section>

          {/* Getting Started - Mobile optimized */}
          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-slate-800 mb-3 sm:mb-4 border-b border-slate-200 pb-2">
              Getting Started
            </h2>
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-4 sm:p-6 lg:p-8 border border-indigo-200">
              <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-3 sm:mb-4 text-center">
                Ready to take control of your finances?
              </h3>
              <p className="text-slate-600 text-center mb-4 sm:mb-6 max-w-2xl mx-auto text-sm sm:text-base">
                Join thousands of users who have already transformed their
                financial habits with SmartSpend. Start your journey
                towards better financial health today.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-center">
                <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-xs sm:text-sm font-bold">
                    1
                  </div>
                  <h4 className="font-semibold text-slate-800 text-xs sm:text-sm mb-1">
                    Create Account
                  </h4>
                  <p className="text-slate-600 text-xs">
                    Sign up in seconds with just your email
                  </p>
                </div>
                <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-xs sm:text-sm font-bold">
                    2
                  </div>
                  <h4 className="font-semibold text-slate-800 text-xs sm:text-sm mb-1">
                    Add Your Data
                  </h4>
                  <p className="text-slate-600 text-xs">
                    Import or manually add your financial information
                  </p>
                </div>
                <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-xs sm:text-sm font-bold">
                    3
                  </div>
                  <h4 className="font-semibold text-slate-800 text-xs sm:text-sm mb-1">
                    Start Managing
                  </h4>
                  <p className="text-slate-600 text-xs">
                    Track, analyze, and optimize your spending
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Contact Developers Section */}
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-4 border-b border-slate-200 pb-2">
              Contact Developers
            </h2>
            <Contact />
          </section>

          {/* Enhanced Footer */}
          <footer className="text-center py-8 border-t border-slate-200 mt-8 bg-gradient-to-r from-slate-50 to-gray-50">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800">
                SmartSpend
              </h3>
              <p className="text-slate-600 max-w-md mx-auto">
                Empowering smarter financial decisions through intelligent
                expense tracking, bill management, and warranty protection.
              </p>
              <div className="flex justify-center space-x-6 text-sm text-slate-500">
                <span>© 2025 SmartSpend</span>
                <span>•</span>
                <span>Privacy First</span>
                <span>•</span>
                <span>Always Free</span>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default About;
