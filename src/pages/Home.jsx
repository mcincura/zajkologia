import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SearchBar from '../components/SearchBar';
import PostCard from '../components/PostCard';
import { apiFetch, mapPostFromApi } from '../api/client';

const Home = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [posts, setPosts] = useState([]);
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            setError('');
            try {
                const [catsRes, postsRes] = await Promise.all([
                    apiFetch('/api/categories'),
                    apiFetch('/api/posts'),
                ]);
                if (cancelled) return;
                setCategories(catsRes?.categories || []);
                setPosts((postsRes?.posts || []).map(mapPostFromApi));
            } catch (err) {
                if (cancelled) return;
                setError(err?.message || 'Failed to load posts');
                setCategories([]);
                setPosts([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => {
            cancelled = true;
        };
    }, []);

    const filteredPosts = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return posts.filter((post) => {
            const title = (post.title || '').toLowerCase();
            const excerpt = (post.excerpt || '').toLowerCase();
            const matchesSearch = !term || title.includes(term) || excerpt.includes(term);
            const matchesCategory = selectedCategory ? post.category === selectedCategory : true;
            return matchesSearch && matchesCategory;
        });
    }, [posts, searchTerm, selectedCategory]);

    return (
      <>
        {/* Hero Section */}
        <section
          style={{
            backgroundColor: "var(--color-light)",
            padding: "4rem 0",
            marginBottom: "3rem",
            textAlign: "center",
          }}
        >
          <div
            className="container"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "1.5rem",
            }}
          >
            {/*<img src="/zajo.png" alt="Zajkológia logo" style={{ height: '40px', marginBottom: '1rem' }} />*/}
            <h1 style={{ fontSize: "3rem", color: "var(--color-accent)" }}>
              Vitajte na Zajkológii
            </h1>
            <p
              style={{
                fontSize: "1.25rem",
                maxWidth: "600px",
                margin: "0 auto",
                color: "#555",
              }}
            >
              Spájame lásku ku králikom s poznaním, aby mohli žiť
              šťastný, zdravý a spokojný život.
            </p>
            <SearchBar onSearch={setSearchTerm} />
          </div>
        </section>

        <div className="container">
          {/* Categories */}
          <div style={{ marginBottom: "3rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "1rem",
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={() => setSelectedCategory(null)}
                style={{
                  padding: "0.5rem 1.5rem",
                  borderRadius: "50px",
                  backgroundColor: !selectedCategory ? "#9b6a6c" : "white",
                  color: !selectedCategory ? "white" : "#9b6a6c",
                  border: "1px solid #9b6a6c",
                  fontWeight: "600",
                  transition: "all 0.2s",
                }}
              >
                Všetko
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.name)}
                  style={{
                    padding: "0.5rem 1.5rem",
                    borderRadius: "50px",
                    backgroundColor:
                      selectedCategory === cat.name ? "#9b6a6c" : "white",
                    color: selectedCategory === cat.name ? "white" : "#9b6a6c",
                    border: `1px solid #9b6a6c`,
                    fontWeight: "600",
                    transition: "all 0.2s",
                  }}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Posts Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "2rem",
              marginBottom: "4rem",
            }}
          >
            {loading ? (
              <div
                style={{
                  gridColumn: "1 / -1",
                  textAlign: "center",
                  padding: "3rem",
                }}
              >
                <h3>Načítavam…</h3>
              </div>
            ) : error ? (
              <div
                style={{
                  gridColumn: "1 / -1",
                  textAlign: "center",
                  padding: "3rem",
                }}
              >
                <h3>Nepodarilo sa načítať články</h3>
                <div style={{ color: "#666", marginTop: "0.5rem" }}>
                  {error}
                </div>
              </div>
            ) : filteredPosts.length > 0 ? (
              filteredPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))
            ) : (
              <div
                style={{
                  gridColumn: "1 / -1",
                  textAlign: "center",
                  padding: "3rem",
                }}
              >
                <h3>Žiadne články nespĺňajú vaše kritériá vyhľadávania</h3>
              </div>
            )}
          </div>

          {/* Recommendations Section */}
          <section style={{ marginBottom: "4rem" }}>
            <h2 style={{ textAlign: "center", marginBottom: "2rem" }}>
              Odporúčané
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "1.5rem",
              }}
            >
              {posts.slice(0, 3).map((post) => (
                <Link
                  to={`/post/${post.slug}`}
                  key={post.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    backgroundColor: "white",
                    padding: "1rem",
                    borderRadius: "var(--radius)",
                    boxShadow: "var(--shadow)",
                  }}
                >
                  <img
                    src={post.image}
                    alt=""
                    style={{
                      width: "80px",
                      height: "80px",
                      borderRadius: "4px",
                      objectFit: "cover",
                    }}
                  />
                  <div>
                    <h4 style={{ fontSize: "1rem", marginBottom: "0.25rem" }}>
                      {post.title}
                    </h4>
                    <span
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--color-primary)",
                      }}
                    >
                      {post.category}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </>
    );
};

export default Home;
