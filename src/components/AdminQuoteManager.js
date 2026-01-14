import React, { useState, useEffect } from "react";
import {
  getQuotesFromFirebase,
  addQuoteToFirebase,
  updateQuoteInFirebase,
  deleteQuoteFromFirebase,
} from "../services/firebaseService";

function AdminQuoteManager() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingQuote, setEditingQuote] = useState(null);
  const [editForm, setEditForm] = useState({
    quote: "",
    author: "",
  });
  const [newQuoteForm, setNewQuoteForm] = useState({
    quote: "",
    author: "",
  });
  const [deletingQuote, setDeletingQuote] = useState(null);
  const [addingQuote, setAddingQuote] = useState(false);

  useEffect(() => {
    loadQuotes();
  }, []);

  const loadQuotes = async () => {
    try {
      setLoading(true);
      const fetchedQuotes = await getQuotesFromFirebase();
      setQuotes(fetchedQuotes);
    } catch (error) {
      console.error("Error loading quotes:", error);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (quote) => {
    setEditingQuote(quote.id);
    setEditForm({
      quote: quote.quote,
      author: quote.author,
    });
  };

  const cancelEdit = () => {
    setEditingQuote(null);
    setEditForm({
      quote: "",
      author: "",
    });
  };

  const saveEdit = async () => {
    if (!editingQuote) return;

    try {
      const result = await updateQuoteInFirebase(
        editingQuote,
        editForm.quote,
        editForm.author
      );

      if (result.success) {
        await loadQuotes();
        setEditingQuote(null);
        setEditForm({
          quote: "",
          author: "",
        });
      } else {
        alert("Failed to update quote: " + result.error);
      }
    } catch (error) {
      console.error("Error updating quote:", error);
      alert("Failed to update quote: " + error.message);
    }
  };

  const confirmDelete = (quote) => {
    setDeletingQuote(quote);
    document.body.style.overflow = "hidden";
    document.body.classList.add("modal-open");
  };

  const cancelDelete = () => {
    setDeletingQuote(null);
    document.body.style.overflow = "unset";
    document.body.classList.remove("modal-open");
  };

  const deleteConfirmed = async () => {
    if (!deletingQuote) return;

    try {
      const result = await deleteQuoteFromFirebase(deletingQuote.id);

      if (result.success) {
        await loadQuotes();
        setDeletingQuote(null);
        // Restore body scroll
        document.body.style.overflow = "unset";
        document.body.classList.remove("modal-open");
      } else {
        alert("Failed to delete quote: " + result.error);
      }
    } catch (error) {
      console.error("Error deleting quote:", error);
      alert("Failed to delete quote: " + error.message);
    }
  };

  const addQuote = async () => {
    if (!newQuoteForm.quote.trim() || !newQuoteForm.author.trim()) {
      alert("Please fill in both quote and author fields.");
      return;
    }

    try {
      setAddingQuote(true);
      const result = await addQuoteToFirebase(
        newQuoteForm.quote,
        newQuoteForm.author
      );

      if (result.success) {
        await loadQuotes();
        setNewQuoteForm({
          quote: "",
          author: "",
        });
      } else {
        alert("Failed to add quote: " + result.error);
      }
    } catch (error) {
      console.error("Error adding quote:", error);
      alert("Failed to add quote: " + error.message);
    } finally {
      setAddingQuote(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="glass-card p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-400 mx-auto mb-4"></div>
            <p className="text-gray-200">Loading quotes...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 sm:p-4 lg:p-6">
      <div className="w-full mx-auto max-w-none sm:max-w-4xl lg:max-w-6xl xl:max-w-7xl">
        {/* Header */}
        <div
          className="glass-card p-4 sm:p-6 mb-6"
          style={{ marginBottom: "10px" }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-100 mb-2">
                💬 Quote Management
              </h1>
              <p className="text-gray-300">
                Manage inspirational quotes displayed on your site.
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <button onClick={loadQuotes} className="btn btn-secondary">
                🔄 Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Add New Quote */}
        <div className="glass-card p-4 sm:p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-100 mb-4">
            ➕ Add New Quote
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Quote
              </label>
              <textarea
                value={newQuoteForm.quote}
                onChange={(e) =>
                  setNewQuoteForm({ ...newQuoteForm, quote: e.target.value })
                }
                className="input w-full"
                rows="3"
                placeholder="Enter the quote text..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Author
              </label>
              <input
                type="text"
                value={newQuoteForm.author}
                onChange={(e) =>
                  setNewQuoteForm({ ...newQuoteForm, author: e.target.value })
                }
                className="input w-full"
                placeholder="Enter the author name..."
              />
            </div>
            <button
              onClick={addQuote}
              disabled={addingQuote}
              className="btn btn-primary disabled:opacity-50"
            >
              {addingQuote ? "Adding..." : "Add Quote"}
            </button>
          </div>
        </div>

        {/* Quotes List */}
        <div className="glass-card p-4 sm:p-6">
          <h2 className="text-xl font-semibold text-gray-100 mb-4">
            📝 Quotes ({quotes.length})
          </h2>

          {quotes.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">💬</div>
              <h3 className="text-xl font-medium text-gray-100 mb-2">
                No quotes found
              </h3>
              <p className="text-gray-300">Add your first quote above!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {quotes.map((quote) => (
                <div
                  key={quote.id}
                  className="border border-gray-600 rounded-lg p-4 bg-gray-800 bg-opacity-30"
                >
                  {editingQuote === quote.id ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-200 mb-2">
                          Quote
                        </label>
                        <textarea
                          value={editForm.quote}
                          onChange={(e) =>
                            setEditForm({ ...editForm, quote: e.target.value })
                          }
                          className="input w-full"
                          rows="3"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-200 mb-2">
                          Author
                        </label>
                        <input
                          type="text"
                          value={editForm.author}
                          onChange={(e) =>
                            setEditForm({ ...editForm, author: e.target.value })
                          }
                          className="input w-full"
                        />
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={saveEdit}
                          className="btn btn-primary text-sm"
                        >
                          💾 Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="btn btn-secondary text-sm"
                        >
                          ❌ Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <blockquote className="text-gray-200 text-lg italic mb-2">
                        "{quote.quote}"
                      </blockquote>
                      <cite className="text-gray-400 text-sm">
                        — {quote.author}
                      </cite>
                      <div className="flex space-x-2 mt-3">
                        <button
                          onClick={() => startEdit(quote)}
                          className="text-primary-400 hover:text-primary-300 transition-colors text-sm"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => confirmDelete(quote)}
                          className="text-red-400 hover:text-red-300 transition-colors text-sm"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingQuote && (
        <div className="admin-modal">
          <div className="glass-card p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-100 mb-4">
              Confirm Deletion
            </h3>

            <div className="mb-4">
              <p className="text-gray-200 mb-2">
                Are you sure you want to delete this quote?
              </p>
              <blockquote className="text-gray-300 italic mb-2">
                "{deletingQuote.quote}"
              </blockquote>
              <p className="text-sm text-gray-400">— {deletingQuote.author}</p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={cancelDelete}
                className="flex-1 btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={deleteConfirmed}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminQuoteManager;
