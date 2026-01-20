import React from "react";

/* =========================
   Herbruikbare subcomponenten
   ========================= */

function Quote({ children }) {
  return (
    <blockquote
      style={{
        fontStyle: "italic",
        margin: "1rem 0",
        paddingLeft: "1rem",
        borderLeft: "3px solid #8b5cf6",
      }}
    >
      {children}
    </blockquote>
  );
}

function Image({ src, alt, style = {} }) {
  return (
    <img
      src={src}
      alt={alt}
      style={{
        width: "100%",
        height: "auto",
        borderRadius: "0.5rem",
        ...style,
      }}
    />
  );
}

/* =========================
   Tekstuele content
   ========================= */

function GR5TextContent({ isMobile }) {
  return (
    <>
      <p>
        De <strong>GR5</strong> is veel meer dan zomaar een wandelpad. Het is
        een van de bekendste{" "}
        <strong>langeafstandswandelroutes van Europa</strong> en voor veel
        wandelaars een echte droomtocht. De route maakt deel uit van het
        internationale netwerk van <em>Grande Randonnée (GR)</em>-paden.
      </p>

      <p>
        Vanuit <strong>Hoek van Holland</strong>, aan de Noordzee, slingert de
        GR5 zich door <strong>Nederland, België, Luxemburg en Frankrijk</strong>{" "}
        om uiteindelijk te eindigen aan de{" "}
        <strong>Middellandse Zee in Nice</strong>. Sommige wandelaars starten
        hun tocht symbolisch met een schelp of een flesje zeewater uit de
        Noordzee, om datzelfde water maanden later in de Middellandse Zee weer
        uit te gieten.
      </p>

      <blockquote>
        <p>“Deux mille kilomètres à pied, ça use les souliers!”</p>
      </blockquote>

      <h4>Waarom is de GR5 zo populair?</h4>

      <p>
        Wat de GR5 zo bijzonder maakt, is de enorme <strong>afwisseling</strong>
        . De wandelaar doorkruist onderweg verschillende landschappen en
        klimaten.
      </p>

      <ul>
        <li>Vlakke dijken, polders en veldwegen in Nederland en Vlaanderen</li>
        <li>Heuvelachtige gebieden zoals de Ardennen en de Vogezen</li>
        <li>Smalle bergpaden en spectaculaire uitzichten in de Alpen</li>
      </ul>

      <p>
        Over de hele route volg je dezelfde{" "}
        <strong>wit-rood gestreepte markeringen</strong>. Daardoor is de GR5
        goed bewegwijzerd en toegankelijk voor zowel ervaren wandelaars als
        gemotiveerde beginners.
      </p>

      <h4>De GR5 in cijfers</h4>

      <ul>
        <li>
          <strong>Lengte:</strong> meer dan 2.000 kilometer
        </li>
        <li>
          <strong>Landen:</strong> Nederland, België, Luxemburg, Frankrijk en
          een klein stukje Zwitserland
        </li>
        <li>
          <strong>Duur:</strong> ongeveer 100 tot 125 wandeldagen
        </li>
        <li>
          <strong>Type:</strong> langeafstandswandeling (thru-hike of in
          etappes)
        </li>
        <li>
          <strong>Hoogte:</strong> van zeeniveau tot hoog in de Alpen
        </li>
      </ul>

      {!isMobile && (
        <Image
          src="/images/GR5_E2.jpg"
          alt="GR5 sign"
          style={{
            width: "200px",
            float: "right",
            marginLeft: "1rem",
            marginBottom: "1rem",
          }}
        />
      )}

      <p>
        Slechts een kleine groep wandelaars legt de GR5 in één keer af. De
        meeste mensen verdelen de route in <strong>etappes</strong>, gespreid
        over meerdere vakanties of jaren.
      </p>

      <h4>Meer informatie en handige links</h4>

      <p>
        Wie meer wil weten of zelf plannen maakt, kan terecht bij de volgende
        betrouwbare websites:
      </p>

      <ul>
        <li>
          Officiële organisatie van de GR-paden in Frankrijk:{" "}
          <a
            href="https://www.ffrandonnee.fr/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#8b5cf6", textDecoration: "underline" }}
          >
            https://www.ffrandonnee.fr/
          </a>
        </li>
        <li>
          Overzicht en geschiedenis van de GR5:{" "}
          <a
            href="https://nl.wikipedia.org/wiki/GR_5"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#8b5cf6", textDecoration: "underline" }}
          >
            https://nl.wikipedia.org/wiki/GR_5
          </a>
        </li>
        <li>
          Gedetailleerde etappes, kaarten en wandeltips:{" "}
          <a
            href="https://www.gr-infos.com/gr5.htm"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#8b5cf6", textDecoration: "underline" }}
          >
            https://www.gr-infos.com/gr5.htm
          </a>
        </li>
        <li>
          Europese langeafstandswandelroutes (E2-netwerk):{" "}
          <a
            href="https://www.era-ewv-ferp.org/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#8b5cf6", textDecoration: "underline" }}
          >
            https://www.era-ewv-ferp.org/
          </a>
        </li>
        <li>
          Verhalen en ervaringen van langeafstandswandelaars:{" "}
          <a
            href="https://www.longdistancepaths.eu/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#8b5cf6", textDecoration: "underline" }}
          >
            https://www.longdistancepaths.eu/
          </a>
        </li>
      </ul>
    </>
  );
}

/* =========================
   Hoofdcomponent
   ========================= */

export default function GR5TabContent({ isMobile }) {
  return (
    <>
      <h3>Wat is de GR5?</h3>

      {isMobile ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            alignItems: "center",
          }}
        >
          <GR5TextContent isMobile={isMobile} />

          <Image
            src="/images/GR5_E2.jpg"
            alt="GR5 sign"
            style={{ maxWidth: "300px" }}
          />

          <Image
            src="/images/Europa_wandel_E2_GR5_Continent.svg.png"
            alt="GR5 route map"
            style={{ maxWidth: "300px" }}
          />

          <Image
            src="/images/wwmelberg.png"
            alt="Wandelen in de bergen"
            style={{ maxWidth: "300px" }}
          />
        </div>
      ) : (
        <>
          <Image
            src="/images/wwmelberg.png"
            alt="Wandelen in de bergen"
            style={{
              width: "200px",
              float: "left",
              marginRight: "1rem",
              marginTop: "rem",
            }}
          />

          <Image
            src="/images/Europa_wandel_E2_GR5_Continent.svg.png"
            alt="GR5 route map"
            style={{
              width: "200px",
              float: "right",
              marginLeft: "1rem",
              marginBottom: "1rem",
            }}
          />

          <GR5TextContent isMobile={isMobile} />

          <div style={{ clear: "both" }} />
        </>
      )}
    </>
  );
}

/* =========================
   Plain text versie (optioneel)
   ========================= */

export function getGR5TextContent() {
  return `
Wat is de GR5?

De GR5 is veel meer dan zomaar een wandelpad. Het is een van de bekendste langeafstandswandelroutes van Europa en voor veel wandelaars een echte droomtocht. De route maakt deel uit van het internationale netwerk van Grande Randonnée (GR)-paden.

Vanuit Hoek van Holland, aan de Noordzee, slingert de GR5 zich door Nederland, België, Luxemburg en Frankrijk om uiteindelijk te eindigen aan de Middellandse Zee in Nice. Sommige wandelaars starten hun tocht symbolisch met een schelp of een flesje zeewater uit de Noordzee, om datzelfde water maanden later in de Middellandse Zee weer uit te gieten.

"Deux mille kilomètres à pied, ça use les souliers!"

Waarom is de GR5 zo populair?

Wat de GR5 zo bijzonder maakt, is de enorme afwisseling. De wandelaar doorkruist onderweg verschillende landschappen en klimaten.

- Vlakke dijken, polders en veldwegen in Nederland en Vlaanderen
- Heuvelachtige gebieden zoals de Ardennen en de Vogezen
- Smalle bergpaden en spectaculaire uitzichten in de Alpen

Over de hele route volg je dezelfde wit-rood gestreepte markeringen. Daardoor is de GR5 goed bewegwijzerd en toegankelijk voor zowel ervaren wandelaars als gemotiveerde beginners.

De GR5 in cijfers

- Lengte: meer dan 2.000 kilometer
- Landen: Nederland, België, Luxemburg, Frankrijk en een klein stukje Zwitserland
- Duur: ongeveer 100 tot 125 wandeldagen
- Type: langeafstandswandeling (thru-hike of in etappes)
- Hoogte: van zeeniveau tot hoog in de Alpen

Slechts een kleine groep wandelaars legt de GR5 in één keer af. De meeste mensen verdelen de route in etappes, gespreid over meerdere vakanties of jaren.

Meer informatie en handige links

Wie meer wil weten of zelf plannen maakt, kan terecht bij de volgende betrouwbare websites:

- Officiële organisatie van de GR-paden in Frankrijk: https://www.ffrandonnee.fr/
- Overzicht en geschiedenis van de GR5: https://nl.wikipedia.org/wiki/GR_5
- Gedetailleerde etappes, kaarten en wandeltips: https://www.gr-infos.com/gr5.htm
- Europese langeafstandswandelroutes (E2-netwerk): https://www.era-ewv-ferp.org/
- Verhalen en ervaringen van langeafstandswandelaars: https://www.longdistancepaths.eu/
`;
}
