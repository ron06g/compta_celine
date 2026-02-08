import React, { useState, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import * as XLSX from 'xlsx';

const CalculateurRGDU = () => {
  const [effectif, setEffectif] = useState(10);
  const [tmin, setTmin] = useState(0.02);
  const [smicMensuelBase, setSmicMensuelBase] = useState(1823.03);
  const [salaireMoyenBase, setSalaireMoyenBase] = useState(2000);
  const [puissance, setPuissance] = useState(1.75);
  const [salaires, setSalaires] = useState(Array(12).fill(2000));
  const [smicParMois, setSmicParMois] = useState(Array(12).fill(1823.03));
  const [heuresParMois, setHeuresParMois] = useState(Array(12).fill(151.67));
  const [lissageActif, setLissageActif] = useState(false);
  const [modeArrondi, setModeArrondi] = useState(true);
  const [ongletActif, setOngletActif] = useState('salaires');
  const [moisVerification, setMoisVerification] = useState(0);

  // Calcul automatique de Tdelta selon l'effectif
  const tdelta = effectif < 50 ? 0.3781 : 0.3821;
  const coeffMax = tmin + tdelta;

  // Appliquer le SMIC de base à tous les mois
  const appliquerSmicBase = () => {
    setSmicParMois(Array(12).fill(smicMensuelBase));
  };

  // Appliquer le salaire moyen à tous les mois
  const appliquerSalaireBase = () => {
    setSalaires(Array(12).fill(salaireMoyenBase));
    setLissageActif(true);
  };

  // Réinitialiser le lissage
  const resetLissage = () => {
    setLissageActif(false);
  };

  // Modifier un salaire mensuel
  const modifierSalaire = (index, valeur) => {
    const nouveauxSalaires = [...salaires];
    nouveauxSalaires[index] = parseFloat(valeur) || 0;
    setSalaires(nouveauxSalaires);
    setLissageActif(false);
  };

  // Modifier le SMIC d'un mois et propager aux mois suivants
  const modifierSmicMois = (index, valeur) => {
    const nouveauxSmic = [...smicParMois];
    const nouvelleValeur = parseFloat(valeur) || 0;
    
    // Appliquer la valeur au mois actuel et tous les mois suivants
    for (let i = index; i < 12; i++) {
      nouveauxSmic[i] = nouvelleValeur;
    }
    
    setSmicParMois(nouveauxSmic);
  };

  // Modifier les heures d'un mois
  const modifierHeuresMois = (index, valeur) => {
    const nouvellesHeures = [...heuresParMois];
    nouvellesHeures[index] = parseFloat(valeur) || 0;
    setHeuresParMois(nouvellesHeures);
  };

  // Exporter vers Excel
  const exporterVersExcel = () => {
    // Préparer les données pour l'export
    const donneesExport = donneesCalculees.map(d => ({
      'Mois': d.mois,
      'Salaire brut (€)': d.salaireBrut.toFixed(2),
      'SMIC mensuel (€)': d.smicMois.toFixed(2),
      'Heures mensuelles': d.heuresMois.toFixed(2),
      'SMIC proratisé (€)': d.smicProratise.toFixed(2),
      '% temps': d.pourcentageTemps.toFixed(2) + '%',
      'Cumul salaire (€)': d.salaireCumule.toFixed(2),
      'Cumul SMIC (€)': d.smicCumule.toFixed(2),
      'Coefficient': d.coefficient.toFixed(4),
      'Taux mois (%)': d.tauxReduction.toFixed(2),
      'Réduction mois (€)': d.reductionMensuelle.toFixed(2),
      'Cumul réduction (€)': d.reductionCumulative.toFixed(2),
      'Coût avant réduction (€)': d.coutAvantReduction.toFixed(2),
      'Coût après réduction (€)': d.coutApresReduction.toFixed(2)
    }));

    // Ajouter une ligne de totaux
    donneesExport.push({
      'Mois': 'TOTAL',
      'Salaire brut (€)': totaux.salaireAnnuel.toFixed(2),
      'SMIC mensuel (€)': '',
      'Heures mensuelles': '',
      'SMIC proratisé (€)': '',
      '% temps': '',
      'Cumul salaire (€)': '',
      'Cumul SMIC (€)': '',
      'Coefficient': '',
      'Taux mois (%)': totaux.tauxMoyen.toFixed(2),
      'Réduction mois (€)': '',
      'Cumul réduction (€)': totaux.reductionAnnuelle.toFixed(2),
      'Coût avant réduction (€)': totaux.coutAvant.toFixed(2),
      'Coût après réduction (€)': totaux.coutApres.toFixed(2)
    });

    // Créer une feuille de calcul
    const ws = XLSX.utils.json_to_sheet(donneesExport);
    
    // Créer un classeur
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'RGDU 2026');

    // Ajouter une deuxième feuille avec les paramètres
    const parametres = [
      { 'Paramètre': 'Effectif entreprise', 'Valeur': effectif },
      { 'Paramètre': 'FNAL', 'Valeur': effectif < 50 ? '0,10%' : '0,50%' },
      { 'Paramètre': 'Tmin', 'Valeur': tmin },
      { 'Paramètre': 'Tdelta', 'Valeur': tdelta },
      { 'Paramètre': 'Coefficient max', 'Valeur': coeffMax },
      { 'Paramètre': 'Puissance (P)', 'Valeur': puissance },
      { 'Paramètre': 'SMIC mensuel base', 'Valeur': smicMensuelBase + ' €' }
    ];
    const wsParams = XLSX.utils.json_to_sheet(parametres);
    XLSX.utils.book_append_sheet(wb, wsParams, 'Paramètres');

    // Télécharger le fichier
    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `RGDU_2026_${date}.xlsx`);
  };

  // Fonction d'arrondi conditionnelle
  const arrondir = (valeur) => {
    if (modeArrondi) {
      return Math.round(valeur * 10000) / 10000;
    }
    return valeur;
  };

  // Calculs pour chaque mois avec régularisation progressive
  const donneesCalculees = useMemo(() => {
    const heuresBaseMensuel = 151.67; // Base légale temps plein
    let reductionCumulee = 0;
    
    return salaires.map((salaireMensuel, index) => {
      // Nombre de mois écoulés depuis janvier
      const nbMois = index + 1;
      
      // Calcul du SMIC proratisé pour ce mois
      let smicProratise = (smicParMois[index] / heuresBaseMensuel) * heuresParMois[index];
      smicProratise = arrondir(smicProratise);
      
      // Calcul cumulatif depuis janvier
      let salaireCumule = salaires.slice(0, nbMois).reduce((sum, s) => sum + s, 0);
      salaireCumule = arrondir(salaireCumule);
      
      // SMIC cumulé proratisé
      let smicCumule = smicParMois.slice(0, nbMois).reduce((sum, smic, i) => {
        const smicMoisProratise = (smic / heuresBaseMensuel) * heuresParMois[i];
        return sum + arrondir(smicMoisProratise);
      }, 0);
      smicCumule = arrondir(smicCumule);
      
      // Coefficient basé sur le cumul (mais appliqué au salaire du mois uniquement)
      let ratio = (3 * smicCumule) / salaireCumule;
      ratio = arrondir(ratio);
      
      let coefficientCumule = 0;
      
      if (salaireCumule < 3 * smicCumule && salaireCumule > 0) {
        let partieInterieure = (1/2) * (ratio - 1);
        partieInterieure = arrondir(partieInterieure);
        
        let puissanceResult = Math.pow(partieInterieure, puissance);
        puissanceResult = arrondir(puissanceResult);
        
        let tdeltaPart = tdelta * puissanceResult;
        tdeltaPart = arrondir(tdeltaPart);
        
        coefficientCumule = tmin + tdeltaPart;
        coefficientCumule = Math.min(coefficientCumule, coeffMax);
        coefficientCumule = arrondir(coefficientCumule);
      }
      
      // IMPORTANT : La réduction mensuelle = coefficient (calculé sur cumul) × rémunération DU MOIS
      // C'est la méthode de régularisation progressive URSSAF
      let reductionMensuelle = salaireMensuel * coefficientCumule;
      reductionMensuelle = arrondir(reductionMensuelle);
      
      // Cumul des réductions depuis janvier (pour info)
      reductionCumulee += reductionMensuelle;
      reductionCumulee = arrondir(reductionCumulee);
      
      // Taux effectif pour ce mois (identique au coefficient puisqu'on applique au mois)
      const tauxReduction = coefficientCumule * 100;
      
      // Pourcentage de temps travaillé
      const pourcentageTemps = (heuresParMois[index] / heuresBaseMensuel) * 100;
      
      return {
        mois: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'][index],
        salaireBrut: salaireMensuel,
        smicMois: smicParMois[index],
        heuresMois: heuresParMois[index],
        smicProratise: smicProratise,
        pourcentageTemps: pourcentageTemps,
        salaireCumule: salaireCumule,
        smicCumule: smicCumule,
        ratio: ratio,
        coefficient: coefficientCumule,
        tauxReduction: tauxReduction,
        reductionMensuelle: reductionMensuelle,
        reductionCumulative: reductionCumulee,
        coutAvantReduction: salaireMensuel * 1.45,
        coutApresReduction: (salaireMensuel * 1.45) - reductionMensuelle
      };
    });
  }, [salaires, smicParMois, heuresParMois, tmin, tdelta, puissance, coeffMax, modeArrondi]);

  // Totaux annuels
  const totaux = useMemo(() => {
    const salaireAnnuelTotal = donneesCalculees.reduce((sum, d) => sum + d.salaireBrut, 0);
    const reductionAnnuelle = donneesCalculees.reduce((sum, d) => sum + d.reductionMensuelle, 0);
    const coutAvant = donneesCalculees.reduce((sum, d) => sum + d.coutAvantReduction, 0);
    const coutApres = donneesCalculees.reduce((sum, d) => sum + d.coutApresReduction, 0);
    
    return {
      salaireAnnuel: salaireAnnuelTotal,
      reductionAnnuelle,
      economie: reductionAnnuelle,
      coutAvant,
      coutApres,
      tauxMoyen: (reductionAnnuelle / salaireAnnuelTotal) * 100
    };
  }, [donneesCalculees]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Source+Sans+Pro:wght@300;400;600&display=swap');
        
        * {
          font-family: 'Source Sans Pro', sans-serif;
        }
        
        h1, h2, h3 {
          font-family: 'Playfair Display', serif;
        }
        
        .card-premium {
          background: linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%);
          border: 1px solid rgba(148, 163, 184, 0.2);
          backdrop-filter: blur(10px);
          transition: all 0.3s ease;
          margin-bottom: 20px;
        }
        
        .card-premium:hover {
          border-color: rgba(234, 179, 8, 0.4);
          box-shadow: 0 20px 60px rgba(234, 179, 8, 0.15);
          transform: translateY(-2px);
        }
        
        .input-premium {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(148, 163, 184, 0.3);
          color: white;
          transition: all 0.2s ease;
        }
        
        .input-premium:focus {
          outline: none;
          border-color: rgba(234, 179, 8, 0.6);
          box-shadow: 0 0 0 3px rgba(234, 179, 8, 0.1);
        }
        
        .btn-primary {
          background: linear-gradient(135deg, #eab308 0%, #ca8a04 100%);
          color: #0f172a;
          font-weight: 600;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(234, 179, 8, 0.3);
        }
        
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(234, 179, 8, 0.4);
        }
        
        .btn-secondary {
          background: rgba(148, 163, 184, 0.2);
          border: 1px solid rgba(148, 163, 184, 0.3);
          transition: all 0.3s ease;
        }
        
        .btn-secondary:hover {
          background: rgba(148, 163, 184, 0.3);
          border-color: rgba(148, 163, 184, 0.5);
        }
        
        .stat-card {
          background: linear-gradient(135deg, rgba(234, 179, 8, 0.1) 0%, rgba(202, 138, 4, 0.05) 100%);
          border-left: 4px solid #eab308;
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fadeInUp 0.6s ease-out;
        }
        
        .table-row {
          transition: all 0.2s ease;
        }
        
        .table-row:hover {
          background: rgba(234, 179, 8, 0.05);
        }
        
        .recharts-tooltip-wrapper {
          outline: none;
        }
        
        .recharts-default-tooltip {
          background: rgba(15, 23, 42, 0.95) !important;
          border: 1px solid rgba(234, 179, 8, 0.3) !important;
          borderRadius: 8px !important;
        }
        
        .tab-button {
          padding: 12px 24px;
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-bottom: none;
          color: rgba(148, 163, 184, 0.7);
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          border-radius: 12px 12px 0 0;
          margin-bottom: -1px;
        }
        
        .tab-button:hover {
          background: rgba(30, 41, 59, 0.7);
          color: rgba(234, 179, 8, 0.8);
        }
        
        .tab-button.active {
          background: linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%);
          color: #eab308;
          border-color: rgba(148, 163, 184, 0.2);
          border-bottom-color: transparent;
          z-index: 1;
        }
        
        .tab-content {
          border-top: 1px solid rgba(148, 163, 184, 0.2);
          margin-top: -1px;
        }
      `}</style>
      
      {/* En-tête */}
      <div className="max-w-7xl mx-auto mb-12 animate-fade-in">
        <div className="text-center mb-4">
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-600 bg-clip-text text-transparent">
            Calculateur RGDU 2026
          </h1>
          <p className="text-slate-300 text-lg">
            Réduction Générale Dégressive Unique des Cotisations Patronales
          </p>
        </div>
        
        <div className="h-1 w-32 mx-auto bg-gradient-to-r from-transparent via-yellow-400 to-transparent rounded-full"></div>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Barre d'onglets - attachée aux sections */}
        <div className="animate-fade-in mb-0">
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div className="flex gap-1">
              <button
                onClick={() => setOngletActif('salaires')}
                className={`tab-button ${ongletActif === 'salaires' ? 'active' : ''}`}
              >
                📊 Salaires
              </button>
              <button
                onClick={() => setOngletActif('parametres')}
                className={`tab-button ${ongletActif === 'parametres' ? 'active' : ''}`}
              >
                ⚙️ Paramètres
              </button>
              <button
                onClick={() => setOngletActif('verification')}
                className={`tab-button ${ongletActif === 'verification' ? 'active' : ''}`}
              >
                🔍 Vérification
              </button>
            </div>
            
            <label className="flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-slate-700/30 rounded-lg transition-all mb-1">
              <input
                type="checkbox"
                checked={modeArrondi}
                onChange={(e) => setModeArrondi(e.target.checked)}
                className="w-4 h-4 accent-yellow-400 cursor-pointer"
              />
              <span className="text-sm text-slate-300">Arrondir à 4 décimales</span>
            </label>
          </div>
        </div>

        {/* Onglet: Paramètres */}
        {ongletActif === 'parametres' && (
          <div className="tab-content">
        {/* Paramètres de calcul */}
        <div className="card-premium rounded-t-none rounded-2xl p-8 animate-fade-in" style={{animationDelay: '0.1s'}}>
          <h2 className="text-3xl font-semibold mb-6 text-yellow-400">Paramètres de calcul</h2>
          
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm text-slate-300 mb-2 font-medium">Salaire mensuel moyen (€)</label>
              <input
                type="number"
                step="0.01"
                value={salaireMoyenBase}
                onChange={(e) => setSalaireMoyenBase(parseFloat(e.target.value) || 0)}
                className="input-premium w-full px-4 py-3 rounded-lg"
              />
              <button
                onClick={appliquerSalaireBase}
                className="mt-2 w-full btn-secondary px-3 py-2 rounded text-xs"
              >
                Appliquer à tous les mois
              </button>
              <p className="text-xs text-slate-400 mt-1">Lissage automatique des 12 mois</p>
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-2 font-medium">SMIC mensuel de base (€)</label>
              <input
                type="number"
                step="0.01"
                value={smicMensuelBase}
                onChange={(e) => setSmicMensuelBase(parseFloat(e.target.value) || 0)}
                className="input-premium w-full px-4 py-3 rounded-lg"
              />
              <button
                onClick={appliquerSmicBase}
                className="mt-2 w-full btn-secondary px-3 py-2 rounded text-xs"
              >
                Appliquer à tous les mois
              </button>
              <p className="text-xs text-slate-400 mt-1">Valeur 2026 : 1 823,03 €</p>
            </div>
          </div>

          <hr className="border-slate-600 my-6" />
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div>
              <label className="block text-sm text-slate-300 mb-2 font-medium">Effectif de l'entreprise</label>
              <input
                type="number"
                value={effectif}
                onChange={(e) => setEffectif(parseInt(e.target.value) || 0)}
                className="input-premium w-full px-4 py-3 rounded-lg"
              />
              <p className="text-xs text-slate-400 mt-1">
                {effectif < 50 ? 'FNAL à 0,10%' : 'FNAL à 0,50%'}
              </p>
            </div>
            
            <div>
              <label className="block text-sm text-slate-300 mb-2 font-medium">Tmin (seuil minimal)</label>
              <input
                type="number"
                step="0.0001"
                value={tmin}
                onChange={(e) => setTmin(parseFloat(e.target.value) || 0)}
                className="input-premium w-full px-4 py-3 rounded-lg"
              />
              <p className="text-xs text-slate-400 mt-1">Exonération minimale : {(tmin * 100).toFixed(2)}%</p>
            </div>
            
            <div>
              <label className="block text-sm text-slate-300 mb-2 font-medium">Tdelta (calculé auto)</label>
              <input
                type="number"
                step="0.0001"
                value={tdelta}
                disabled
                className="input-premium w-full px-4 py-3 rounded-lg opacity-70 cursor-not-allowed"
              />
              <p className="text-xs text-slate-400 mt-1">Coeff. max : {(coeffMax * 100).toFixed(2)}%</p>
            </div>
            
            <div>
              <label className="block text-sm text-slate-300 mb-2 font-medium">Puissance (P)</label>
              <input
                type="number"
                step="0.01"
                value={puissance}
                onChange={(e) => setPuissance(parseFloat(e.target.value) || 0)}
                className="input-premium w-full px-4 py-3 rounded-lg"
              />
              <p className="text-xs text-slate-400 mt-1">Pente de dégressivité</p>
            </div>
          </div>
            
          <div className="stat-card p-4 rounded-lg">
            <p className="text-sm text-slate-300 mb-1">Formule appliquée :</p>
            <code className="text-yellow-400 text-sm">
              C = {tmin.toFixed(4)} + ({tdelta.toFixed(4)} × [(1/2) × ((3 × SMIC cumulé / Rémunération cumulée) - 1)]^{puissance})
            </code>
          </div>
        </div>
          </div>
        )}

        {/* Onglet: Salaires */}
        {ongletActif === 'salaires' && (
          <div className="tab-content">
        {/* Saisie des salaires mensuels */}
        <div className="card-premium rounded-t-none rounded-2xl p-8 animate-fade-in" style={{animationDelay: '0.2s'}}>
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h2 className="text-3xl font-semibold text-yellow-400">Salaires mensuels</h2>
              <p className="text-slate-400 text-sm mt-2">
                💡 Calcul progressif : la réduction est calculée de manière cumulative depuis janvier avec régularisation mensuelle
              </p>
            </div>
            <button
              onClick={exporterVersExcel}
              className="btn-primary px-6 py-3 rounded-lg flex items-center gap-2 whitespace-nowrap"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Exporter Excel
            </button>
          </div>
          
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
            <p className="text-blue-300 text-sm mb-2">
              <strong>📋 Méthode de calcul (régularisation progressive URSSAF) :</strong>
            </p>
            <ul className="text-blue-300 text-sm space-y-1 list-disc list-inside">
              <li>Chaque mois, le <strong>coefficient</strong> est recalculé sur la base du <strong>cumul</strong> des salaires et SMIC depuis janvier</li>
              <li>Ce coefficient s'applique à la <strong>rémunération du mois en cours uniquement</strong></li>
              <li>Formule : <code className="text-yellow-300">Réduction mois N = Coefficient(cumul) × Salaire du mois N</code></li>
              <li>Pas de soustraction des mois précédents (contrairement à la régularisation annuelle)</li>
            </ul>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-600">
                  <th className="text-left py-3 px-3 text-slate-300 font-semibold sticky left-0 bg-slate-800/95 backdrop-blur z-10">Mois</th>
                  <th className="text-right py-3 px-3 text-slate-300 font-semibold">Salaire brut (€)</th>
                  <th className="text-right py-3 px-3 text-slate-300 font-semibold bg-blue-900/20">SMIC mois (€)</th>
                  <th className="text-right py-3 px-3 text-slate-300 font-semibold bg-blue-900/20">Heures</th>
                  <th className="text-right py-3 px-3 text-slate-300 font-semibold bg-blue-900/20">SMIC pror. (€)</th>
                  <th className="text-right py-3 px-3 text-slate-300 font-semibold bg-blue-900/20">% temps</th>
                  <th className="text-right py-3 px-3 text-slate-300 font-semibold">Cumul sal. (€)</th>
                  <th className="text-right py-3 px-3 text-slate-300 font-semibold">Cumul SMIC (€)</th>
                  <th className="text-right py-3 px-3 text-slate-300 font-semibold">Coeff.</th>
                  <th className="text-right py-3 px-3 text-slate-300 font-semibold">Taux mois</th>
                  <th className="text-right py-3 px-3 text-slate-300 font-semibold bg-green-900/20">Réd. mois (€)</th>
                  <th className="text-right py-3 px-3 text-slate-300 font-semibold bg-amber-900/20">Cumul réd. (€)</th>
                </tr>
              </thead>
              <tbody>
                {donneesCalculees.map((donnee, index) => (
                  <tr key={index} className="table-row border-b border-slate-700/50">
                    <td className="py-3 px-3 font-medium text-yellow-400 sticky left-0 bg-slate-800/95 backdrop-blur z-10">{donnee.mois}</td>
                    <td className="py-3 px-3 text-right">
                      <input
                        type="number"
                        step="0.01"
                        value={salaires[index]}
                        onChange={(e) => modifierSalaire(index, e.target.value)}
                        className="input-premium w-28 px-2 py-1 rounded text-right ml-auto text-sm"
                      />
                    </td>
                    <td className="py-3 px-3 text-right bg-blue-900/10">
                      <input
                        type="number"
                        step="0.01"
                        value={smicParMois[index]}
                        onChange={(e) => modifierSmicMois(index, e.target.value)}
                        className="input-premium w-28 px-2 py-1 rounded text-right ml-auto text-sm"
                      />
                    </td>
                    <td className="py-3 px-3 text-right bg-blue-900/10">
                      <input
                        type="number"
                        step="0.01"
                        value={heuresParMois[index]}
                        onChange={(e) => modifierHeuresMois(index, e.target.value)}
                        className="input-premium w-24 px-2 py-1 rounded text-right ml-auto text-sm"
                      />
                    </td>
                    <td className="py-3 px-3 text-right text-blue-300 text-sm bg-blue-900/10">
                      {donnee.smicProratise.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right text-blue-300 text-sm bg-blue-900/10">
                      {donnee.pourcentageTemps.toFixed(1)}%
                    </td>
                    <td className="py-3 px-3 text-right text-slate-400 text-sm">
                      {donnee.salaireCumule.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-400 text-sm">
                      {donnee.smicCumule.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-300 text-sm">
                      {donnee.coefficient.toFixed(4)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-300 text-sm">
                      {donnee.tauxReduction.toFixed(2)}%
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-green-400 text-sm bg-green-900/10">
                      {donnee.reductionMensuelle.toFixed(2)} €
                    </td>
                    <td className="py-3 px-3 text-right text-amber-400 text-sm bg-amber-900/10">
                      {donnee.reductionCumulative.toFixed(2)} €
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-4 text-xs text-slate-400">
            <p><strong>💡 Colonnes bleues :</strong> SMIC et heures modifiables pour chaque mois (proratisation, évolution du SMIC)</p>
            <p><strong>Base légale :</strong> 151,67 heures/mois pour un temps plein</p>
          </div>
        </div>

        {/* Chiffres Clés */}
        <div className="card-premium rounded-2xl p-6 mt-8 animate-fade-in" style={{animationDelay: '0.3s'}}>
          <h2 className="text-2xl font-semibold mb-4 text-yellow-400">Chiffres Clés</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <p className="text-slate-400 text-xs mb-1">Salaire annuel total</p>
              <p className="text-2xl font-bold text-white">{totaux.salaireAnnuel.toFixed(2)} €</p>
            </div>
            
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <p className="text-slate-400 text-xs mb-1">Réduction annuelle</p>
              <p className="text-2xl font-bold text-green-400">{totaux.reductionAnnuelle.toFixed(2)} €</p>
            </div>
            
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <p className="text-slate-400 text-xs mb-1">Taux moyen de réduction</p>
              <p className="text-2xl font-bold text-yellow-400">{totaux.tauxMoyen.toFixed(2)}%</p>
            </div>
          </div>
        </div>
          </div>
        )}

        {/* Onglet: Vérification */}
        {ongletActif === 'verification' && (
          <div className="tab-content">
        {/* Vérification du calcul d'un mois */}
        <div className="card-premium rounded-t-none rounded-2xl p-6 animate-fade-in" style={{animationDelay: '0.35s'}}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-yellow-400">🔍 Vérification détaillée du calcul</h3>
            <select
              value={moisVerification}
              onChange={(e) => setMoisVerification(parseInt(e.target.value))}
              className="input-premium px-4 py-2 rounded-lg text-sm"
            >
              {donneesCalculees.map((d, i) => (
                <option key={i} value={i}>{d.mois}</option>
              ))}
            </select>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-4 font-mono text-sm">
            {donneesCalculees.length > 0 && (() => {
              const d = donneesCalculees[moisVerification];
              let ratio = (3 * d.smicCumule) / d.salaireCumule;
              ratio = arrondir(ratio);
              
              let partieInterieure = (1/2) * (ratio - 1);
              partieInterieure = arrondir(partieInterieure);
              
              let puissanceResult = Math.pow(partieInterieure, puissance);
              puissanceResult = arrondir(puissanceResult);
              
              let tdeltaPart = tdelta * puissanceResult;
              tdeltaPart = arrondir(tdeltaPart);
              
              let coeffFinal = tmin + tdeltaPart;
              coeffFinal = arrondir(coeffFinal);
              
              return (
                <>
                  <p className="text-slate-300 mb-3">Pour le mois de <strong className="text-yellow-400">{d.mois}</strong> :</p>
                  
                  <div className="space-y-1 text-slate-400 mb-4">
                    <p className="text-blue-300 font-semibold">📊 Données :</p>
                    <p>• Salaire du mois : <span className="text-white">{d.salaireBrut.toFixed(2)} €</span></p>
                    <p>• Cumul salaires : <span className="text-white">{d.salaireCumule.toFixed(2)} €</span></p>
                    <p>• Cumul SMIC proratisé : <span className="text-white">{d.smicCumule.toFixed(2)} €</span></p>
                    <p>• Plafond 3×SMIC cumulé : <span className="text-white">{(d.smicCumule * 3).toFixed(2)} €</span></p>
                  </div>

                  <div className="space-y-2 bg-yellow-900/10 p-3 rounded border border-yellow-700/30 mb-4">
                    <p className="text-yellow-300 font-semibold">🧮 Calcul pas à pas (interprétation actuelle) :</p>
                    <p className="text-slate-300">
                      1️⃣ Ratio = (3 × SMIC cumulé) / Salaire cumulé
                    </p>
                    <p className="text-white pl-6">
                      = (3 × {d.smicCumule.toFixed(2)}) / {d.salaireCumule.toFixed(2)}
                    </p>
                    <p className="text-white pl-6">
                      = {(3 * d.smicCumule).toFixed(2)} / {d.salaireCumule.toFixed(2)}
                    </p>
                    <p className="text-green-400 pl-6 font-semibold">
                      = {ratio.toFixed(6)}
                    </p>

                    <p className="text-slate-300 mt-3">
                      2️⃣ Partie intérieure = (1/2) × (Ratio - 1)
                    </p>
                    <p className="text-white pl-6">
                      = 0.5 × ({ratio.toFixed(6)} - 1)
                    </p>
                    <p className="text-white pl-6">
                      = 0.5 × {(ratio - 1).toFixed(6)}
                    </p>
                    <p className="text-green-400 pl-6 font-semibold">
                      = {partieInterieure.toFixed(6)}
                    </p>

                    <p className="text-slate-300 mt-3">
                      3️⃣ Élever à la puissance P = {puissance}
                    </p>
                    <p className="text-white pl-6">
                      = {partieInterieure.toFixed(6)}^{puissance}
                    </p>
                    <p className="text-green-400 pl-6 font-semibold">
                      = {puissanceResult.toFixed(6)}
                    </p>

                    <p className="text-slate-300 mt-3">
                      4️⃣ Multiplier par Tdelta
                    </p>
                    <p className="text-white pl-6">
                      = {tdelta.toFixed(4)} × {puissanceResult.toFixed(6)}
                    </p>
                    <p className="text-green-400 pl-6 font-semibold">
                      = {tdeltaPart.toFixed(6)}
                    </p>

                    <p className="text-slate-300 mt-3">
                      5️⃣ Ajouter Tmin
                    </p>
                    <p className="text-white pl-6">
                      = {tmin.toFixed(4)} + {tdeltaPart.toFixed(6)}
                    </p>
                    <p className="text-yellow-400 pl-6 font-bold text-base">
                      Coefficient = {coeffFinal.toFixed(6)}
                    </p>

                    <p className="text-slate-300 mt-4 pt-3 border-t border-yellow-700/30">
                      6️⃣ Réduction du mois
                    </p>
                    <p className="text-white pl-6">
                      = Salaire du mois × Coefficient
                    </p>
                    <p className="text-white pl-6">
                      = {d.salaireBrut.toFixed(2)} € × {coeffFinal.toFixed(6)}
                    </p>
                    <p className="text-green-400 pl-6 font-bold text-lg">
                      = {(d.salaireBrut * coeffFinal).toFixed(2)} €
                    </p>
                  </div>

                  <div className="mt-4 text-xs text-blue-300 bg-blue-900/10 border border-blue-700/30 rounded p-3">
                    <p className="font-semibold mb-2">💡 Si le résultat ne correspond toujours pas, vérifie :</p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>Les salaires de Jan, Fév, Mar (le cumul doit être exact)</li>
                      <li>Les heures et SMIC de chaque mois précédent</li>
                      <li>La valeur exacte de Tdelta ({tdelta}) et Tmin ({tmin})</li>
                      <li>La valeur de P ({puissance})</li>
                      <li>Le mode arrondi à 4 décimales est {modeArrondi ? 'ACTIVÉ' : 'DÉSACTIVÉ'}</li>
                    </ul>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
          </div>
        )}

        {/* Graphiques */}
        {ongletActif === 'salaires' && (
        <div className="gap-8 animate-fade-in" style={{animationDelay: '0.4s'}}>
          {/* Graphique: Évolution du salaire et de la réduction */}
          <div className="card-premium rounded-2xl p-8">
            <h3 className="text-2xl font-semibold mb-6 text-yellow-400">Évolution mensuelle</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={donneesCalculees}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                <XAxis dataKey="mois" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    border: '1px solid rgba(234, 179, 8, 0.3)',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="salaireBrut" 
                  stroke="#eab308" 
                  strokeWidth={3}
                  name="Salaire brut (€)"
                  dot={{ fill: '#eab308', r: 5 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="reductionMensuelle" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  name="Réduction (€)"
                  dot={{ fill: '#10b981', r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Graphique: Taux de réduction */}
          <div className="card-premium rounded-2xl p-8">
            <h3 className="text-2xl font-semibold mb-6 text-yellow-400">Taux de réduction (%)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={donneesCalculees}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                <XAxis dataKey="mois" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    border: '1px solid rgba(234, 179, 8, 0.3)',
                    borderRadius: '8px'
                  }}
                  formatter={(value) => `${parseFloat(value).toFixed(2)}%`}
                />
                <Area 
                  type="monotone" 
                  dataKey="tauxReduction" 
                  stroke="#f59e0b" 
                  fill="rgba(245, 158, 11, 0.3)"
                  strokeWidth={2}
                  name="Taux (%)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Graphique: Comparaison coût avant/après */}
          <div className="card-premium rounded-2xl p-8 lg:col-span-2">
            <h3 className="text-2xl font-semibold mb-6 text-yellow-400">Coût employeur : avant et après réduction</h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={donneesCalculees}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                <XAxis dataKey="mois" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    border: '1px solid rgba(234, 179, 8, 0.3)',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar 
                  dataKey="coutAvantReduction" 
                  fill="#ef4444" 
                  name="Coût avant réduction (€)"
                  radius={[8, 8, 0, 0]}
                />
                <Bar 
                  dataKey="coutApresReduction" 
                  fill="#10b981" 
                  name="Coût après réduction (€)"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
            
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="stat-card p-4 rounded-lg">
                <p className="text-sm text-slate-300 mb-1">Coût total avant réduction</p>
                <p className="text-2xl font-bold text-red-400">{totaux.coutAvant.toFixed(2)} €</p>
              </div>
              <div className="stat-card p-4 rounded-lg">
                <p className="text-sm text-slate-300 mb-1">Coût total après réduction</p>
                <p className="text-2xl font-bold text-green-400">{totaux.coutApres.toFixed(2)} €</p>
              </div>
              <div className="stat-card p-4 rounded-lg">
                <p className="text-sm text-slate-300 mb-1">Économie totale</p>
                <p className="text-2xl font-bold text-amber-400">{totaux.economie.toFixed(2)} €</p>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Footer */}
        <div className="text-center py-8 text-slate-400 text-sm animate-fade-in" style={{animationDelay: '0.5s'}}>
          <p className="font-semibold mb-2">Calculateur RGDU 2026 - Réduction Générale Dégressive Unique</p>
          <p className="mt-2 mb-1">Formule du coefficient (calculé sur cumul depuis janvier) :</p>
          <code className="text-yellow-400">C = Tmin + (Tdelta × [(1/2) × (3 × SMIC cumulé / Rémunération cumulée - 1)]^P)</code>
          <p className="mt-2">Réduction mensuelle = Coefficient × Rémunération du mois</p>
        </div>
      </div>
    </div>
  );
};

export default CalculateurRGDU;
