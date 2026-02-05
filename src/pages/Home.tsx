import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import SpaceGeometryBackground from '@/components/SpaceGeometryBackground';
import HoudiniParticles from '@/components/HoudiniParticles';
import { Shield, CheckCircle, Upload, Search, Wand2, ArrowRight, CheckCircle as Check, ShoppingBag, GitBranch } from 'lucide-react';
import { useWallet } from '@/hooks/use-wallet';

const Home = () => {
  const { connect, isConnecting, switchAccount, address } = useWallet();
  const features = [
    {
      icon: ShoppingBag,
      title: 'NFT Marketplace',
      description: 'Browse, discover, and collect protected digital assets with verified provenance.',
      href: '/marketplace',
    },
    {
      icon: GitBranch,
      title: 'Content Provenance',
      description: 'Track complete ownership history and verify authenticity of any digital asset.',
      href: '/provenance',
    },
    {
      icon: Shield,
      title: 'Blind Watermarking',
      description: 'Embed invisible watermarks into images, videos, and audio for ownership verification.',
      href: '/watermark',
    },
    {
      icon: CheckCircle,
      title: 'Content Verification',
      description: 'Verify if content contains your watermark and prove ownership.',
      href: '/verify',
    },
    {
      icon: Upload,
      title: 'IPFS Storage',
      description: 'Store your content on decentralized IPFS network with blockchain records.',
      href: '/ipfs',
    },
    {
      icon: Search,
      title: 'Plagiarism Detection',
      description: 'Compare content and detect unauthorized usage of your intellectual property.',
      href: '/plagiarism',
    },
    {
      icon: Wand2,
      title: 'AI Content Generation',
      description: 'Generate AI content with built-in ownership tracking and watermarking.',
      href: '/generate',
    },
  ];

  const benefits = [
    'Decentralized ownership registry',
    'Immutable blockchain records',
    'Advanced AI watermarking',
    'IPFS distributed storage',
    'MetaMask integration',
    'Plagiarism protection',
  ];

  return (
    <div className="min-h-screen relative">
      <SpaceGeometryBackground />
      <HoudiniParticles />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="space-y-8">
            <h1 className="text-5xl sm:text-7xl font-bold tracking-tight py-2 md:py-4">
              <span className="block text-foreground">Protect Your</span>
              <span className="block text-gradient">Digital Content</span>
            </h1>
            
            <p className="max-w-3xl mx-auto text-xl text-muted-foreground leading-relaxed">
              Netra is a decentralized AI content ownership registry that uses blockchain technology 
              and advanced watermarking to protect your intellectual property forever.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/marketplace">
                <Button size="lg" className="btn-primary text-lg px-8 py-6">
                  Explore Marketplace
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link to="/verify">
                <Button size="lg" variant="outline" className="btn-glass text-lg px-8 py-6">
                  Verify Content
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Comprehensive Content Protection
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Advanced features to secure, verify, and manage your digital content ownership
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Link key={feature.title} to={feature.href} className="group">
                <Card className="glass-card hover:scale-105 transition-all duration-300 h-full">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 rounded-xl bg-blockchain-primary/10">
                        <feature.icon className="w-6 h-6 text-blockchain-primary" />
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-blockchain-primary transition-colors" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed text-sm">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-foreground mb-6">
                Why Choose Netra?
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Built on cutting-edge blockchain technology with AI-powered content protection
              </p>
              
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <Check className="w-5 h-5 text-blockchain-primary flex-shrink-0" />
                    <span className="text-foreground">{benefit}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8">
                <Link to="/wallet">
                  <Button size="lg" className="btn-primary">
                    View Your Wallet
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>

            <div className="relative">
              <Card className="glass-card p-8">
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blockchain-primary/10 mb-4">
                      <Shield className="w-8 h-8 text-blockchain-primary" />
                    </div>
                    <h3 className="text-2xl font-semibold text-foreground mb-2">
                      Secure & Decentralized
                    </h3>
                    <p className="text-muted-foreground">
                      Your content ownership is recorded on an immutable blockchain, 
                      ensuring permanent and tamper-proof protection.
                    </p>
                  </div>
                  
                  <div className="border-t border-glass-border pt-6">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Network Status</span>
                      <span className="flex items-center text-green-500">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                        Active
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
              
              {/* Floating elements */}
              <div className="absolute -top-4 -right-4 w-8 h-8 border border-blockchain-primary/30 rotate-45 animate-float"></div>
              <div className="absolute -bottom-4 -left-4 w-6 h-6 border border-blockchain-secondary/40 animate-float" style={{ animationDelay: '2s' }}></div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <Card className="glass-card p-12">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Ready to Secure Your Content?
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join the future of digital content protection with blockchain-powered ownership registry.
            </p>
            <Link to="/watermark">
              <Button size="lg" className="btn-primary text-lg px-10 py-6">
                Start Protecting Content
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default Home;
