import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-purple-50 to-pink-50">
      <div className="max-w-6xl mx-auto px-4 py-12">
        
        {/* Hero Section */}
        <section className="text-center mb-16">
          <div className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium px-4 py-1 rounded-full mb-6">
            For the Next Generation
          </div>
          
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 mb-6 leading-tight">
            Learn. Play. <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Grow.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            A vibrant platform for youth featuring fun trivia, community Q&A, mentorship, skill-building, and real opportunities.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/trivia" 
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-full font-semibold text-lg hover:from-blue-700 hover:to-purple-700 transition shadow-lg hover:shadow-xl"
            >
              Play Trivia Now
            </Link>
            <Link 
              href="/qna" 
              className="bg-white border-2 border-purple-200 text-purple-700 px-8 py-4 rounded-full font-semibold text-lg hover:bg-purple-50 transition"
            >
              Explore Q&A
            </Link>
          </div>
        </section>

        {/* Feature Cards */}
        <section className="grid md:grid-cols-3 gap-6">
          {/* Trivia Card */}
          <div className="bg-white p-7 rounded-3xl shadow-md border border-blue-100 hover:shadow-xl transition hover:-translate-y-1">
            <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center text-3xl mb-5">
              🎯
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Daily Trivia</h3>
            <p className="text-gray-600">
              Play fun and educational quizzes every day. No account needed to start!
            </p>
          </div>

          {/* Q&A Card */}
          <div className="bg-white p-7 rounded-3xl shadow-md border border-purple-100 hover:shadow-xl transition hover:-translate-y-1">
            <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center text-3xl mb-5">
              💬
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Community Q&A</h3>
            <p className="text-gray-600">
              Ask questions about career, relationships, education, parenting and more.
            </p>
          </div>

          {/* Mentorship Card */}
          <div className="bg-white p-7 rounded-3xl shadow-md border border-pink-100 hover:shadow-xl transition hover:-translate-y-1">
            <div className="w-14 h-14 bg-pink-100 rounded-2xl flex items-center justify-center text-3xl mb-5">
              🚀
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Mentorship & Opportunities</h3>
            <p className="text-gray-600">
              Connect with mentors and discover freelancing gigs, internships and real chances.
            </p>
          </div>
        </section>

      </div>
    </div>
  );
}