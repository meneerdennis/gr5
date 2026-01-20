import React from "react";

export default function AppTabContent() {
  return (
    <div>
      <section>
        <h2>Waarom deze webapp?</h2>

        <p>
          Bij de voorbereidingen van mij wandeling merkte ik dat apps zoals{" "}
          <a
            href="https://www.polarsteps.com/"
            target="_blank"
            rel="noopener"
            style={{ color: "#8b5cf6", textDecoration: "underline" }}
          >
            Polarsteps
          </a>{" "}
          en{" "}
          <a
            href="https://www.strava.com/"
            target="_blank"
            rel="noopener"
            style={{ color: "#8b5cf6", textDecoration: "underline" }}
          >
            Strava
          </a>{" "}
          niet alles boden wat ik nodig had voor een meerdaagse trektocht.
        </p>

        <p>
          Het belangrijkste doel:{" "}
          <strong>mijn progressie op de GR5 bijhouden</strong> – niet alleen in
          kilometers, maar ook in beleving.
        </p>

        <p>Daarnaast wil ik:</p>

        <ul>
          <li>
            Dagboek en ervaringen bijhouden om herinneringen levendig te houden
          </li>
          <li>Familie en vrienden up-to-date houden over mijn voortgang</li>
          <li>
            Hosts van{" "}
            <a
              href="https://welcometomygarden.org/"
              target="_blank"
              rel="noopener"
              style={{ color: "#8b5cf6", textDecoration: "underline" }}
            >
              Welcome To My Garden
            </a>{" "}
            informeren over mijn tocht.
          </li>
        </ul>

        <p>
          Deze app is dus niet alleen een tracker, maar ook een reisdagboek,
          communicatiemiddel en herinneringenarchief.
        </p>
      </section>

      <section>
        <h2>Hoe werkt de app?</h2>

        <ul>
          <li>
            Activiteiten synchroniseren automatisch via Strava (GPX-bestanden
            kunnen ook handmatig toegevoegd worden)
          </li>
          <li>Volledige route overzichtelijk op kaart</li>
          <li>Foto’s toevoegen met geolocatie</li>
          <li>Dagboekfragmenten per dag</li>
          <li>Reageren en commentaar geven op dagelijkse activiteiten</li>
        </ul>

        <p>
          Zo ontstaat stap voor stap een rijk en chronologisch overzicht van de
          tocht.
        </p>
      </section>

      <section>
        <h2>Langetermijnvisie</h2>

        <ul>
          <li>
            Openstellen voor andere hikers om eigen LAW- of GR-routes te volgen
          </li>
          <li>
            Uitbouwen tot een sociaal platform voor wandelaars, gericht op
            beleving en verhalen, niet alleen prestaties
          </li>
        </ul>

        <p>
          Een plek waar routes, ervaringen en mensen samenkomen, speciaal voor
          wie graag te voet de wereld verkent.
        </p>
      </section>
    </div>
  );
}

export function getAppTextContent() {
  return `
Waarom deze webapp?
Tijdens langeafstandswandelingen merkte ik dat bestaande apps zoals Polarsteps en Strava voor mij niet helemaal voldeden. Ze zijn sterk in wat ze doen, maar sluiten niet volledig aan bij wat ik zoek tijdens een meerdaagse trektocht.

Het belangrijkste doel van deze webapp is dan ook het nauwkeurig bijhouden van mijn progressie op de GR5. Niet alleen in kilometers, maar ook in beleving.

Daarnaast zijn er een aantal bijdoelen die voor mij minstens even waardevol zijn:

- Een persoonlijk dagboek bijhouden tijdens de tocht

- Ervaringen en indrukken vastleggen, zodat herinneringen niet vervagen in de overvloed aan landschappen, ontmoetingen en momenten onderweg

- Familie en vrienden op de hoogte houden van mijn huidige locatie, toestand en voortgang

- Hosts van Welcome To My Garden laten meekijken met mijn trip, zodat zij weten waar ik ben en wanneer ik ongeveer in hun buurt verwacht word

Deze app is dus niet alleen een tracker, maar ook een geheugen, een communicatiemiddel en een reisverhaal in wording.

Hoe werkt de app?

De werking van de webapp is bewust eenvoudig gehouden:

- Activiteiten worden automatisch gesynchroniseerd via Strava

  - Indien een koppeling niet meer werkt, kunnen GPX-bestanden ook manueel worden ingevoerd

- Alle activiteiten verschijnen automatisch op één overzichtskaart, zodat de volledige route in één oogopslag zichtbaar is

- Foto’s kunnen rechtstreeks in de app worden toegevoegd, inclusief geolocatie

- Per dag kan een dagboekfragment worden geschreven

- Bezoekers kunnen commentaar geven op dagelijkse activiteiten, wat zorgt voor interactie en betrokkenheid

Zo ontstaat er stap voor stap een rijk en chronologisch overzicht van de tocht.

Langetermijnvisie

Op langere termijn wil ik deze webapp verder openstellen:

- Andere hikers zouden hun eigen LAW- of GR-routes kunnen volgen en documenteren

- De app kan uitgroeien tot een laagdrempelig sociaal platform voor wandelaars, met focus op langeafstandswandelingen, beleving en verhalen — niet op prestaties alleen

Mijn droom is een plek waar routes, ervaringen en mensen samenkomen, speciaal voor wie graag te voet de wereld verkent.

`;
}
