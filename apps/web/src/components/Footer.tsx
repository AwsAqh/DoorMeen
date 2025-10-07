import React from "react";
export default function Footer() {
    return (
      <footer className="bg-slate-800 text-slate-300 py-8 mt-16">
        <div className="container mx-auto px-4 max-w-6xl">
          
          {/* Logo and tagline */}
          <div className="mb-6">
            <h3 className="text-white font-semibold text-lg mb-1">Door Meen</h3>
            <p className="text-sm text-slate-400">Simple queue management for modern businesses</p>
          </div>
          
          {/* Links */}
          <div className="flex flex-wrap gap-6 mb-6 text-sm">
            <a 
               
              className="hover:text-white transition-colors duration-200"
            >
              Contact
            </a>
            <a 
              
              className="hover:text-white transition-colors duration-200"
            >
              Privacy Policy
            </a>
            <a 
              
              className="hover:text-white transition-colors duration-200"
            >
              Terms of Service
            </a>
          </div>
          
          {/* Divider */}
          <div className="border-t border-slate-700 pt-6">
            <p className="text-sm text-slate-400">
              © {new Date().getFullYear()} Door Meen. All rights reserved.
            </p>
          </div>
          
        </div>
      </footer>
    );
  }