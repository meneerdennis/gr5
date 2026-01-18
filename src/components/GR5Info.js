import React, { useState } from "react";

function GR5Info({ isOpen, onClose, isMobile }) {
  const [activeTab, setActiveTab] = useState("gr5");

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
      }}
    >
      <div
        className="glass-card"
        style={{
          padding: "1.5rem",
          maxWidth: "50rem",
          width: "100%",
          margin: "1rem",
          maxHeight: "80vh",
          overflowY: "auto",
          color: "#f1f5f9",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <h2 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>Informatie</h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "1.5rem",
              cursor: "pointer",
              color: "#f1f5f9",
            }}
          >
            ×
          </button>
        </div>
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid rgba(139, 92, 246, 0.2)",
            marginBottom: "1rem",
          }}
        >
          <button
            onClick={() => setActiveTab("gr5")}
            style={{
              padding: "0.5rem 1rem",
              border: "none",
              background:
                activeTab === "gr5" ? "rgba(139, 92, 246, 0.2)" : "transparent",
              color: "#f1f5f9",
              cursor: "pointer",
              fontWeight: activeTab === "gr5" ? "bold" : "normal",
            }}
          >
            GR5
          </button>
          <button
            onClick={() => setActiveTab("route")}
            style={{
              padding: "0.5rem 1rem",
              border: "none",
              background:
                activeTab === "route"
                  ? "rgba(139, 92, 246, 0.2)"
                  : "transparent",
              color: "#f1f5f9",
              cursor: "pointer",
              fontWeight: activeTab === "route" ? "bold" : "normal",
            }}
          >
            Deze app
          </button>
        </div>
        <div>
          {activeTab === "gr5" && (
            <div>
              <h3>Wat is de GR5?</h3>
              {isMobile ? (
                <>
                  <p>
                    De GR5 is een iconische langeafstandswandelroute die deel
                    uitmaakt van het Europese netwerk van Grande
                    Randonnée-paden. Zowel in Vlaanderen als in Wallonië is de
                    GR5 de populairste langeafstandsroute.
                    <p>
                      <quote>
                        "Deux milles kilomètres à pied, ça use les souliers!"
                      </quote>
                    </p>
                  </p>
                  <h4>De GR5: feiten & cijfers</h4>
                  <ul>
                    <li>
                      De GR5 loopt door Nederland, België, Luxemburg, Frankrijk
                      en een klein stukje Zwitserland, van Hoek van Holland naar
                      Nice. Dat is meer dan 2.000 kilometer. Veel wandelaars
                      scheppen symbolisch een flesje water uit de Noordzee bij
                      de start, om het aan het eind in de Middellandse Zee te
                      legen.
                    </li>
                    <li>
                      Je volgt de wit-rood gestreepte markeringen en doorkruist
                      diverse landschappen en hoogtemeters, van vlakke veldwegen
                      in Nederland en Vlaanderen tot pittige bergpaden in de
                      Vogezen en de Alpen.
                    </li>
                    <li>
                      Voor de volledige thru-hike (onafgebroken tocht) reken je
                      op 100 tot 125 stapdagen. De meeste wandelaars verdelen
                      het traject in etappes over verschillende vakanties.
                    </li>
                  </ul>
                  <p>
                    Meer informatie vind je op de officiële website van de
                    Fédération Française de la Randonnée Pédestre:{" "}
                    <a
                      href="https://www.ffrandonnee.fr/"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#8b5cf6" }}
                    >
                      https://www.ffrandonnee.fr/
                    </a>{" "}
                    of op Wikipedia:{" "}
                    <a
                      href="https://nl.wikipedia.org/wiki/GR_5"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#8b5cf6" }}
                    >
                      https://nl.wikipedia.org/wiki/GR_5
                    </a>
                    .
                  </p>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "1rem",
                      alignItems: "center",
                    }}
                  >
                    <img
                      src="/images/Europa_wandel_E2_GR5_Continent.svg.png"
                      alt="GR5 route map"
                      style={{
                        width: "100%",
                        maxWidth: "300px",
                        height: "auto",
                        borderRadius: "0.5rem",
                      }}
                    />
                    <img
                      src="/images/wwmelberg.png"
                      alt="Wandelen in de bergen"
                      style={{
                        width: "100%",
                        maxWidth: "300px",
                        height: "auto",
                        borderRadius: "0.5rem",
                      }}
                    />
                    <img
                      src="/images/GR5_E2.jpg"
                      alt="GR5 sign"
                      style={{
                        width: "100%",
                        maxWidth: "300px",
                        height: "auto",
                        borderRadius: "0.5rem",
                      }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <img
                    src="/images/wwmelberg.png"
                    alt="Wandelen in de bergen"
                    style={{
                      width: "200px",
                      height: "auto",
                      borderRadius: "0.5rem",
                      float: "left",
                      marginRight: "1rem",
                      marginBottom: "1rem",
                    }}
                  />
                  <div style={{ position: "relative" }}>
                    <img
                      src="/images/Europa_wandel_E2_GR5_Continent.svg.png"
                      alt="GR5 route map"
                      style={{
                        width: "200px",
                        height: "auto",
                        borderRadius: "0.5rem",
                        float: "right",
                        marginLeft: "1rem",
                        marginBottom: "1rem",
                      }}
                    />

                    <p>
                      De GR5 is een iconische langeafstandswandelroute die deel
                      uitmaakt van het Europese netwerk van Grande
                      Randonnée-paden. Zowel in Vlaanderen als in Wallonië is de
                      GR5 de populairste langeafstandsroute.
                      <p>
                        <quote>
                          "Deux milles kilomètres à pied, ça use les souliers!"
                        </quote>
                      </p>
                    </p>
                    <h4>De GR5: feiten & cijfers</h4>
                    <ul>
                      <li>
                        De GR5 loopt door Nederland, België, Luxemburg,
                        Frankrijk en een klein stukje Zwitserland, van Hoek van
                        Holland naar Nice. Dat is meer dan 2.000 kilometer. Veel
                        wandelaars scheppen symbolisch een flesje water uit de
                        Noordzee bij de start, om het aan het eind in de
                        Middellandse Zee te legen.
                      </li>

                      <li>
                        Je volgt de wit-rood gestreepte markeringen en
                        doorkruist diverse landschappen en hoogtemeters, van
                        vlakke veldwegen in Nederland en Vlaanderen tot pittige
                        bergpaden in de Vogezen en de Alpen.
                      </li>

                      <li>
                        Voor de volledige thru-hike (onafgebroken tocht) reken
                        je op 100 tot 125 stapdagen. De meeste wandelaars
                        verdelen het traject in etappes over verschillende
                        vakanties.
                      </li>
                    </ul>
                    <img
                      src="/images/GR5_E2.jpg"
                      alt="GR5 sign"
                      style={{
                        width: "200px",
                        height: "auto",
                        borderRadius: "0.5rem",
                        float: "right",
                        marginLeft: "1rem",
                        marginBottom: "1rem",
                      }}
                    />

                    <p>
                      Meer informatie vind je op de officiële website van de
                      Fédération Française de la Randonnée Pédestre:{" "}
                      <a
                        href="https://www.ffrandonnee.fr/"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#8b5cf6" }}
                      >
                        https://www.ffrandonnee.fr/
                      </a>{" "}
                      of op Wikipedia:{" "}
                      <a
                        href="https://nl.wikipedia.org/wiki/GR_5"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#8b5cf6" }}
                      >
                        https://nl.wikipedia.org/wiki/GR_5
                      </a>
                      .
                    </p>
                    <div style={{ clear: "both" }}></div>
                  </div>
                </>
              )}
            </div>
          )}
          {activeTab === "route" && (
            <div>
              <p>Hier komt meer info over deze app.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GR5Info;
