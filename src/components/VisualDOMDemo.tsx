import React, { useState } from 'react';
import { Play, RefreshCw, Globe } from 'lucide-react';
import VisualDOMView from './VisualDOMView';
import { ScrapedElement } from '../utils/scraper';

const sampleScrapedData: ScrapedElement[] = [
  // Navigation container and elements (proper hierarchy)
  {
    tag: 'nav',
    text: 'Main Navigation',
    selector: 'header nav',
    attributes: { class: 'main-nav', role: 'navigation' }
  },
  {
    tag: 'a',
    text: 'Home',
    selector: 'header nav a:nth-of-type(1)',
    attributes: { href: '/', class: 'nav-link' }
  },
  {
    tag: 'a',
    text: 'Products',
    selector: 'header nav a:nth-of-type(2)',
    attributes: { href: '/products', class: 'nav-link' }
  },
  {
    tag: 'a',
    text: 'About',
    selector: 'header nav a:nth-of-type(3)',
    attributes: { href: '/about', class: 'nav-link' }
  },
  {
    tag: 'a',
    text: 'Contact',
    selector: 'header nav a:nth-of-type(4)',
    attributes: { href: '/contact', class: 'nav-link' }
  },

  // Header elements
  {
    tag: 'header',
    text: 'Site Header',
    selector: 'header',
    attributes: { class: 'site-header' }
  },
  {
    tag: 'h1',
    text: 'Welcome to Our Amazing Website',
    selector: 'header h1',
    attributes: { class: 'hero-title', id: 'main-title' }
  },

  // Main content container and elements
  {
    tag: 'main',
    text: 'Main Content Area',
    selector: 'main',
    attributes: { class: 'main-content', role: 'main' }
  },
  {
    tag: 'section',
    text: 'Hero Section',
    selector: 'main .hero-section',
    attributes: { class: 'hero-section' }
  },
  {
    tag: 'h2',
    text: 'Discover Our Premium Features',
    selector: 'main .hero-section h2',
    attributes: { class: 'section-title' }
  },
  {
    tag: 'p',
    text: 'We offer the best solutions for your business needs. Our platform provides cutting-edge technology with user-friendly interfaces.',
    selector: 'main .hero-section .intro p',
    attributes: { class: 'intro-text' }
  },
  {
    tag: 'div',
    text: 'Content Container',
    selector: 'main .content-container',
    attributes: { class: 'content-container' }
  },
  {
    tag: 'p',
    text: 'Join thousands of satisfied customers who have transformed their workflow with our innovative tools.',
    selector: 'main .content-container .description p',
    attributes: { class: 'description-text' }
  },

  // Button elements (duplicates)
  {
    tag: 'button',
    text: 'Get Started',
    selector: 'button:nth-of-type(1)',
    attributes: { class: 'btn btn-primary', type: 'button' },
    nthPosition: 1,
    totalSimilar: 3
  } as any,
  {
    tag: 'button',
    text: 'Get Started',
    selector: 'button:nth-of-type(2)',
    attributes: { class: 'btn btn-secondary', type: 'button' },
    nthPosition: 2,
    totalSimilar: 3
  } as any,
  {
    tag: 'button',
    text: 'Get Started',
    selector: 'button:nth-of-type(3)',
    attributes: { class: 'btn btn-outline', type: 'button' },
    nthPosition: 3,
    totalSimilar: 3
  } as any,

  // Links
  {
    tag: 'a',
    text: 'Learn More About Our Services',
    selector: 'main .cta a',
    attributes: { href: '/services', class: 'cta-link' }
  },
  {
    tag: 'a',
    text: 'View Pricing Plans',
    selector: 'main .pricing a',
    attributes: { href: '/pricing', class: 'pricing-link' }
  },

  // Footer container and elements
  {
    tag: 'footer',
    text: 'Site Footer',
    selector: 'footer',
    attributes: { class: 'site-footer', role: 'contentinfo' }
  },
  {
    tag: 'div',
    text: 'Footer Links Container',
    selector: 'footer .footer-links',
    attributes: { class: 'footer-links' }
  },
  {
    tag: 'a',
    text: 'Privacy Policy',
    selector: 'footer .footer-links a:nth-of-type(1)',
    attributes: { href: '/privacy', class: 'footer-link' }
  },
  {
    tag: 'a',
    text: 'Terms of Service',
    selector: 'footer .footer-links a:nth-of-type(2)',
    attributes: { href: '/terms', class: 'footer-link' }
  },
  {
    tag: 'div',
    text: 'Copyright Container',
    selector: 'footer .copyright',
    attributes: { class: 'copyright' }
  },
  {
    tag: 'p',
    text: '© 2024 Your Company Name. All rights reserved.',
    selector: 'footer .copyright p',
    attributes: { class: 'copyright-text' }
  },

  // Misc elements
  {
    tag: 'div',
    text: 'Special Offer: 30% off your first month!',
    selector: '.promotion div',
    attributes: { class: 'promo-banner' }
  },
  {
    tag: 'input',
    text: 'Enter your email address',
    selector: 'form input[type="email"]',
    attributes: { type: 'email', placeholder: 'Enter your email address', class: 'email-input' }
  }
];

const VisualDOMDemo: React.FC = () => {
  const [selectedElement, setSelectedElement] = useState<ScrapedElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleElementSelect = (element: ScrapedElement, selector: string) => {
    setSelectedElement(element);
    console.log('Demo: Selected element:', element);
    console.log('Demo: Selector:', selector);
  };

  const simulateScraping = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
  };

  return (
    <div className="visual-dom-demo max-w-7xl mx-auto p-6">
      {/* Demo Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
              <Globe className="w-8 h-8 text-blue-600" />
              <span>Visual DOM Layout Demo</span>
            </h1>
            <p className="text-gray-600 mt-2">
              See how scraped website elements are organized in a semantic, visual layout
            </p>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={simulateScraping}
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Scraping...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Simulate Scraping</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Features showcase */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">🏗️ Semantic Grouping</h3>
            <p className="text-sm text-blue-700">
              Elements automatically grouped by header, main, footer, and interactive sections
            </p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-900 mb-2">📱 Responsive Preview</h3>
            <p className="text-sm text-green-700">
              Toggle between desktop and mobile layouts to see how content adapts
            </p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="font-semibold text-purple-900 mb-2">🔍 Element Details</h3>
            <p className="text-sm text-purple-700">
              Hover over elements to see tag, selector, and attribute information
            </p>
          </div>
        </div>
      </div>

      {/* Visual DOM View */}
      {isLoading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Scraping Website...</h3>
          <p className="text-gray-500">Extracting and organizing page elements</p>
        </div>
      ) : (
        <VisualDOMView 
          elements={sampleScrapedData}
          onElementSelect={handleElementSelect}
        />
      )}

      {/* Instructions */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-3">💡 How to Use the Visual DOM Layout</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
          <div>
            <h4 className="font-medium mb-2">🖱️ Interaction:</h4>
            <ul className="space-y-1">
              <li>• Click container headers to expand/collapse sections</li>
              <li>• Hover over elements to see detailed information</li>
              <li>• Click elements to select them for workflow actions</li>
              <li>• Use the preview mode toggles (desktop/mobile)</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">🎯 Features:</h4>
            <ul className="space-y-1">
              <li>• Semantic grouping by page structure</li>
              <li>• Duplicate element detection with nth-selectors</li>
              <li>• Visual styling based on element types</li>
              <li>• Code view toggle to see CSS selectors</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Selected Element Info */}
      {selectedElement && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">🎯 Selected Element</h4>
          <div className="text-sm text-blue-800">
            <p><strong>Text:</strong> "{selectedElement.text}"</p>
            <p><strong>Tag:</strong> &lt;{selectedElement.tag}&gt;</p>
            <p><strong>Selector:</strong> <code className="bg-blue-100 px-1 rounded">{selectedElement.selector}</code></p>
            {selectedElement.attributes && (
              <p><strong>Attributes:</strong> {Object.entries(selectedElement.attributes).map(([key, value]) => `${key}="${value}"`).join(', ')}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VisualDOMDemo; 