import React from "react";
import {
  CheckCircle,
  Users,
  Shield,
  TrendingUp,
  Award,
} from "lucide-react";

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
      {/* Enhanced Header */}
      <header className="text-center py-8 flex-shrink-0 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-blue-50">
        <h1 className="text-3xl font-bold text-slate-800 mb-3">
          About SmartSpend
        </h1>
        <p className="text-lg text-slate-600 max-w-3xl mx-auto">
          Empowering individuals to take control of their financial future
          with intelligent tools and insights
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
            <div className="space-y-6">
              <p className="text-slate-700 leading-relaxed text-lg">
                At SmartSpend, we believe that everyone deserves access to
                powerful financial tools that make managing money simple,
                secure, and stress-free.
              </p>
              <p className="text-slate-600 leading-relaxed">
                Our mission is to democratize personal finance management
                by providing an intuitive, comprehensive platform that
                helps individuals track expenses, manage bills, monitor
                warranties, and make informed financial decisions. We're
                committed to building technology that empowers users to
                achieve their financial goals with confidence and clarity.
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg p-6 border border-indigo-200">
                  <h3 className="font-semibold text-slate-800 mb-3 flex items-center">
                    <Shield className="w-5 h-5 text-indigo-600 mr-2" />
                    Our Values
                  </h3>
                  <ul className="text-slate-600 space-y-2 text-sm">
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                      Privacy and security first
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                      User-centric design
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                      Transparency and trust
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                      Continuous innovation
                    </li>
                  </ul>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
                  <h3 className="font-semibold text-slate-800 mb-3 flex items-center">
                    <Award className="w-5 h-5 text-green-600 mr-2" />
                    Why Choose SmartSpend?
                  </h3>
                  <ul className="text-slate-600 space-y-2 text-sm">
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                      100% free with no hidden costs
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                      Bank-level security
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                      Cross-platform compatibility
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                      Regular feature updates
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Key Features */}
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-4 border-b border-slate-200 pb-2">
              Key Features
            </h2>
            <p className="text-slate-600 mb-6">
              Discover the powerful tools that make SmartSpend your
              ultimate financial companion
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              {features.map((feature) => (
                <div
                  key={feature.name}
                  className="p-6 border border-slate-200 rounded-lg hover:shadow-lg hover:border-indigo-300 transition-all duration-300 bg-gradient-to-br from-white to-slate-50"
                >
                  <h3 className="font-semibold text-slate-800 mb-3 flex items-center">
                    <span className="text-2xl mr-3" aria-hidden="true">
                      {feature.emoji}
                    </span>
                    {feature.name}
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Technology & Security */}
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-4 border-b border-slate-200 pb-2">
              Technology & Security
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-slate-800 mb-2">
                  Secure by Design
                </h3>
                <p className="text-slate-600 text-sm">
                  End-to-end encryption and secure data storage ensure your
                  financial information stays private
                </p>
              </div>

              <div className="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
                <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-slate-800 mb-2">
                  Smart Analytics
                </h3>
                <p className="text-slate-600 text-sm">
                  Advanced algorithms provide insights and trends to help
                  you make better financial decisions
                </p>
              </div>

              <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-slate-800 mb-2">
                  User-Focused
                </h3>
                <p className="text-slate-600 text-sm">
                  Built with user feedback and designed for simplicity
                  without compromising functionality
                </p>
              </div>
            </div>
          </section>

          {/* Getting Started */}
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-4 border-b border-slate-200 pb-2">
              Getting Started
            </h2>
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-8 border border-indigo-200">
              <h3 className="text-lg font-semibold text-slate-800 mb-4 text-center">
                Ready to take control of your finances?
              </h3>
              <p className="text-slate-600 text-center mb-6 max-w-2xl mx-auto">
                Join thousands of users who have already transformed their
                financial habits with SmartSpend. Start your journey
                towards better financial health today.
              </p>
              <div className="grid md:grid-cols-3 gap-4 text-center">
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">
                    1
                  </div>
                  <h4 className="font-semibold text-slate-800 text-sm mb-1">
                    Create Account
                  </h4>
                  <p className="text-slate-600 text-xs">
                    Sign up in seconds with just your email
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">
                    2
                  </div>
                  <h4 className="font-semibold text-slate-800 text-sm mb-1">
                    Add Your Data
                  </h4>
                  <p className="text-slate-600 text-xs">
                    Import or manually add your financial information
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">
                    3
                  </div>
                  <h4 className="font-semibold text-slate-800 text-sm mb-1">
                    Start Managing
                  </h4>
                  <p className="text-slate-600 text-xs">
                    Track, analyze, and optimize your spending
                  </p>
                </div>
              </div>
            </div>
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
                <span>© 2024 SmartSpend</span>
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
