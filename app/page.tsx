"use client";
import Link from "next/link";
import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
	Upload,
	Settings,
	Play,
	Table as TableIcon,
	CheckCircle,
	Info,
	ChevronRight,
	Download,
	FileSpreadsheet,
	AlertCircle,
	Award,
	RefreshCcw,
	ArrowRight,
} from "lucide-react";

/**
 * TOPSIS Calculator App - Serif Edition
 * Unified form structure with Framer Motion animations.
 */
export default function App() {
	const [data, setData] = useState([]);
	const [columns, setColumns] = useState([]);
	const [weights, setWeights] = useState("");
	const [impacts, setImpacts] = useState("");
	const [isAnalyzed, setIsAnalyzed] = useState(false);
	const [error, setError] = useState(null);
	const [librariesLoaded, setLibrariesLoaded] = useState(false);
	const fileInputRef = useRef(null);

	// Load external libraries dynamically
	useEffect(() => {
		const loadScript = (src) => {
			return new Promise((resolve, reject) => {
				const script = document.createElement("script");
				script.src = src;
				script.onload = resolve;
				script.onerror = reject;
				document.head.appendChild(script);
			});
		};

		Promise.all([
			loadScript(
				"https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js",
			),
			loadScript(
				"https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js",
			),
		])
			.then(() => setLibrariesLoaded(true))
			.catch(() =>
				setError(
					"Failed to load processing libraries. Please check your connection.",
				),
			);
	}, []);

	const handleFileUpload = (e) => {
		const file = e.target.files[0];
		if (!file || !librariesLoaded) return;
		setError(null);
		setIsAnalyzed(false);

		const ext = file.name.split(".").pop().toLowerCase();

		const processJson = (json) => {
			if (!json || json.length === 0) {
				setError("The file appears to be empty.");
				return;
			}
			setData(json);
			setColumns(Object.keys(json[0]));
		};

		if (ext === "csv") {
			window.Papa.parse(file, {
				header: true,
				skipEmptyLines: true,
				complete: (result) => processJson(result.data),
				error: () => setError("Error parsing CSV file."),
			});
		} else if (ext === "xlsx" || ext === "xls") {
			const reader = new FileReader();
			reader.onload = (evt) => {
				try {
					const bstr = evt.target.result;
					const wb = window.XLSX.read(bstr, { type: "binary" });
					const ws = wb.Sheets[wb.SheetNames[0]];
					const json = window.XLSX.utils.sheet_to_json(ws);
					processJson(json);
				} catch (e) {
					setError("Error parsing Excel file.");
				}
			};
			reader.readAsBinaryString(file);
		}
	};

	const runTOPSIS = () => {
		if (data.length === 0) return setError("Please upload a dataset first.");
		if (!weights || !impacts)
			return setError("Both Weights and Impacts are required.");

		try {
			const W = weights.split(",").map((s) => {
				const val = Number(s.trim());
				if (isNaN(val)) throw new Error("Invalid weight detected.");
				return val;
			});
			const I = impacts.split(",").map((s) => s.trim());

			const criteriaCols = columns
				.slice(1)
				.filter((c) => c !== "Score" && c !== "Rank");
			if (
				W.length !== criteriaCols.length ||
				I.length !== criteriaCols.length
			) {
				throw new Error(
					`Criteria mismatch. Found ${criteriaCols.length} columns, but ${W.length} weights and ${I.length} impacts provided.`,
				);
			}

			const matrix = data.map((row) => criteriaCols.map((c) => Number(row[c])));
			const norm = criteriaCols.map((_, j) =>
				Math.sqrt(matrix.reduce((sum, r) => sum + Math.pow(r[j], 2), 0)),
			);
			const normalized = matrix.map((row) =>
				row.map((v, j) => (norm[j] === 0 ? 0 : v / norm[j])),
			);
			const weighted = normalized.map((row) => row.map((v, j) => v * W[j]));

			const best = criteriaCols.map((_, j) =>
				I[j] === "+"
					? Math.max(...weighted.map((r) => r[j]))
					: Math.min(...weighted.map((r) => r[j])),
			);
			const worst = criteriaCols.map((_, j) =>
				I[j] === "+"
					? Math.min(...weighted.map((r) => r[j]))
					: Math.max(...weighted.map((r) => r[j])),
			);

			const scores = weighted.map((row) => {
				const dBest = Math.sqrt(
					row.reduce((s, v, j) => s + Math.pow(v - best[j], 2), 0),
				);
				const dWorst = Math.sqrt(
					row.reduce((s, v, j) => s + Math.pow(v - worst[j], 2), 0),
				);
				return dBest + dWorst === 0 ? 0 : dWorst / (dBest + dWorst);
			});

			const ranked = scores
				.map((score, i) => ({ score, i }))
				.sort((a, b) => b.score - a.score)
				.map((r, idx) => ({ ...r, rank: idx + 1 }));

			const finalData = data.map((row, i) => {
				const r = ranked.find((x) => x.i === i);
				return { ...row, Score: r.score.toFixed(4), Rank: r.rank };
			});

			setData(finalData);
			const baseCols = columns.filter((c) => c !== "Score" && c !== "Rank");
			setColumns([...baseCols, "Score", "Rank"]);
			setIsAnalyzed(true);
			setError(null);
		} catch (err) {
			setError(err.message);
		}
	};

	const reset = () => {
		setData([]);
		setColumns([]);
		setWeights("");
		setImpacts("");
		setIsAnalyzed(false);
		setError(null);
	};

	return (
		<div className="min-h-screen bg-zinc-50 text-zinc-900 font-serif selection:bg-zinc-900 selection:text-white pb-24">
			{/* Editorial Navigation */}
			<nav className="bg-white/70 backdrop-blur-xl sticky top-0 z-50 border-b border-zinc-200/50">
				<div className="max-w-4xl mx-auto px-6 h-20 flex justify-between items-center">
					<motion.div
						initial={{ opacity: 0, x: -20 }}
						animate={{ opacity: 1, x: 0 }}
						className="flex items-center gap-3"
					>
						<div className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center">
							<Award className="w-5 h-5 text-white" />
						</div>
						<div>
							<span className="font-bold text-xl tracking-tight block leading-none">
								TOPSIS
							</span>
							<span className="text-[10px] uppercase tracking-widest text-zinc-400 font-sans font-bold">
								Decision Intelligence
							</span>
						</div>
					</motion.div>
					<div className="flex items-center gap-6 font-sans text-xs font-bold uppercase tracking-widest text-zinc-400">
						<span className="hover:text-zinc-900 cursor-pointer transition-colors">
							V 2.0
						</span>
					</div>
				</div>
			</nav>

			<main className="max-w-4xl mx-auto px-6 py-16">
				{/* Header */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.8, ease: "easeOut" }}
					className="text-center mb-16"
				>
					<h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
						Rank with <span className="italic">Precision</span>.
					</h1>
					<p className="text-xl text-zinc-500 max-w-xl mx-auto leading-relaxed italic">
						A minimalist engine for multi-criteria decision making, refined for
						clarity and speed.
					</p>
				</motion.div>

				{/* Unified Form Card */}
				<motion.div
					initial={{ opacity: 0, y: 40 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.2, duration: 0.8 }}
					className="bg-white rounded-[32px] shadow-2xl shadow-zinc-200/50 border border-zinc-100 p-8 md:p-12 mb-20"
				>
					<div className="space-y-12">
						{/* Step 1: File */}
						<div className="relative">
							<label className="font-sans text-[11px] uppercase tracking-[0.2em] font-black text-zinc-400 mb-4 block">
								01. Choose Source
							</label>
							<div
								className={`relative group border-2 border-dashed rounded-2xl p-10 transition-all text-center ${data.length > 0 ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 hover:border-zinc-400"}`}
							>
								<input
									type="file"
									ref={fileInputRef}
									onChange={handleFileUpload}
									className="absolute inset-0 opacity-0 cursor-pointer z-10"
									accept=".csv,.xlsx,.xls"
								/>
								<div className="flex flex-col items-center">
									<div
										className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${data.length > 0 ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-400"}`}
									>
										{data.length > 0 ? (
											<CheckCircle className="w-6 h-6" />
										) : (
											<Upload className="w-6 h-6" />
										)}
									</div>
									<h3 className="text-lg font-bold mb-1">
										{data.length > 0
											? "Data successfully ingested"
											: "Import your dataset"}
									</h3>
									<p className="text-zinc-400 text-sm italic">
										{data.length > 0
											? `${data.length} records found`
											: "Drag and drop CSV or Excel file here"}
									</p>
								</div>
							</div>
							{data.length > 0 && (
								<button
									onClick={reset}
									className="absolute top-0 right-0 font-sans text-[10px] font-bold uppercase tracking-widest text-zinc-300 hover:text-red-500 flex items-center gap-1"
								>
									<RefreshCcw className="w-3 h-3" /> Reset
								</button>
							)}
						</div>

						{/* Step 2: Parameters */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-10">
							<div className="space-y-4">
								<label className="font-sans text-[11px] uppercase tracking-[0.2em] font-black text-zinc-400 block">
									02. Criteria Weights
								</label>
								<div className="group">
									<input
										type="text"
										placeholder="e.g. 0.5, 0.25, 0.25"
										className="w-full bg-white border-b-2 border-zinc-100 py-3 text-lg focus:border-zinc-900 outline-none transition-colors italic placeholder:text-zinc-200"
										value={weights}
										onChange={(e) => setWeights(e.target.value)}
									/>
									<p className="text-[10px] text-zinc-300 mt-2 font-sans italic">
										Numerical weights for each criterion column.
									</p>
								</div>
							</div>

							<div className="space-y-4">
								<label className="font-sans text-[11px] uppercase tracking-[0.2em] font-black text-zinc-400 block">
									03. Column Impacts
								</label>
								<div className="group">
									<input
										type="text"
										placeholder="e.g. +, -, +"
										className="w-full bg-white border-b-2 border-zinc-100 py-3 text-lg focus:border-zinc-900 outline-none transition-colors italic placeholder:text-zinc-200"
										value={impacts}
										onChange={(e) => setImpacts(e.target.value)}
									/>
									<p className="text-[10px] text-zinc-300 mt-2 font-sans italic">
										+ for benefits, - for cost factors.
									</p>
								</div>
							</div>
						</div>

						{/* Step 3: Action */}
						<div className="pt-6">
							<AnimatePresence mode="wait">
								{error && (
									<motion.div
										initial={{ opacity: 0, height: 0 }}
										animate={{ opacity: 1, height: "auto" }}
										exit={{ opacity: 0, height: 0 }}
										className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-3 text-sm font-sans font-medium italic border border-red-100"
									>
										<AlertCircle className="w-4 h-4" /> {error}
									</motion.div>
								)}
							</AnimatePresence>

							<motion.button
								whileHover={{ scale: 1.01 }}
								whileTap={{ scale: 0.98 }}
								onClick={runTOPSIS}
								disabled={!librariesLoaded || data.length === 0}
								className={`w-full py-6 rounded-2xl flex items-center justify-center gap-4 text-xl font-bold transition-all ${data.length > 0 && librariesLoaded
										? "bg-zinc-900 text-white shadow-xl shadow-zinc-300"
										: "bg-zinc-100 text-zinc-300 cursor-not-allowed"
									}`}
							>
								{!librariesLoaded
									? "Initializing Engine..."
									: "Analyze Dataset"}
								<ArrowRight className="w-6 h-6" />
							</motion.button>
						</div>
					</div>
				</motion.div>

				{/* Results Area */}
				<AnimatePresence>
					{isAnalyzed && (
						<motion.section
							initial={{ opacity: 0, y: 40 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: 40 }}
							className="space-y-8"
						>
							<div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-200 pb-6">
								<div>
									<h2 className="text-3xl font-bold tracking-tight">
										Analysis Report
									</h2>
									<p className="text-zinc-400 italic">
										Results sorted by relative closeness to ideal solution.
									</p>
								</div>
								<motion.button
									whileHover={{ x: 5 }}
									onClick={() => {
										const csv = window.Papa.unparse(data);
										const blob = new Blob([csv], {
											type: "text/csv;charset=utf-8;",
										});
										const link = document.createElement("a");
										link.href = URL.createObjectURL(blob);
										link.setAttribute("download", "topsis_results.csv");
										link.click();
									}}
									className="font-sans text-[11px] font-black uppercase tracking-widest flex items-center gap-2 text-zinc-900 bg-zinc-100 px-5 py-3 rounded-full"
								>
									<Download className="w-4 h-4" /> Download Report
								</motion.button>
							</div>

							<div className="bg-white border border-zinc-100 rounded-[32px] overflow-hidden shadow-xl shadow-zinc-200/30">
								<div className="overflow-x-auto">
									<table className="w-full text-left border-collapse">
										<thead>
											<tr className="bg-zinc-50/50">
												{columns.map((col, idx) => (
													<th
														key={idx}
														className="px-8 py-6 font-sans text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 border-b border-zinc-100"
													>
														{col}
													</th>
												))}
											</tr>
										</thead>
										<tbody>
											{data.map((row, rIdx) => (
												<motion.tr
													key={rIdx}
													initial={{ opacity: 0 }}
													animate={{ opacity: 1 }}
													transition={{ delay: rIdx * 0.05 }}
													className={`hover:bg-zinc-50/50 transition-colors group ${rIdx % 2 !== 0 ? "bg-zinc-50/20" : "bg-white"}`}
												>
													{columns.map((col, cIdx) => {
														const isRank = col === "Rank";
														const isScore = col === "Score";
														return (
															<td
																key={cIdx}
																className={`px-8 py-6 border-b border-zinc-50 ${isRank ? "font-bold text-2xl" : "text-zinc-600 text-lg italic"}`}
															>
																{isRank ? (
																	<div className="flex items-center gap-3">
																		<span
																			className={
																				row[col] === 1
																					? "text-zinc-900"
																					: "text-zinc-300"
																			}
																		>
																			{row[col].toString().padStart(2, "0")}
																		</span>
																		{row[col] === 1 && (
																			<div className="w-2 h-2 bg-zinc-900 rounded-full" />
																		)}
																	</div>
																) : isScore ? (
																	<span className="font-sans font-medium text-sm bg-zinc-900 text-white px-3 py-1 rounded-full">
																		{row[col]}
																	</span>
																) : (
																	row[col]
																)}
															</td>
														);
													})}
												</motion.tr>
											))}
										</tbody>
									</table>
								</div>
							</div>
						</motion.section>
					)}
				</AnimatePresence>
			</main>

			{/* Modern Footer */}
			<footer className="mt-12 max-w-4xl mx-auto px-6 pt-12 border-t border-zinc-100">
				<div className="flex flex-col md:flex-row justify-between items-center gap-8">
					<div className="flex items-center gap-3 grayscale opacity-40 hover:opacity-100 transition-opacity">
						<Award className="w-5 h-5" />
						<span className="font-bold tracking-tight text-lg">TOPSIS.</span>
					</div>
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						className="font-sans text-[11px] font-black uppercase tracking-widest text-zinc-400"
					>
						Made with <span className="text-zinc-900">♥</span> by{" "}
						<Link href="https://github.com/TavishSood">
							<span className="text-zinc-900 hover:underline cursor-pointer">
								Tavish Sood
							</span>
						</Link>
					</motion.div>
					<div className="flex gap-8 font-sans text-[10px] font-bold uppercase tracking-widest text-zinc-300">
						<span className="hover:text-zinc-900 cursor-pointer">Archive</span>
						<span className="hover:text-zinc-900 cursor-pointer">Terms</span>
					</div>
				</div>
			</footer>
		</div>
	);
}
