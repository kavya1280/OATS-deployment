import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import axios from "axios";

// CSS Imports
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "datatables.net-bs5/css/dataTables.bootstrap5.min.css";
import "datatables.net-buttons-bs5/css/buttons.bootstrap5.min.css";

// Chart.js Core & Plugins
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
} from "chart.js";

import { Bar, Doughnut, Pie, Line, Chart as BaseChart } from "react-chartjs-2";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { MatrixController, MatrixElement } from "chartjs-chart-matrix";

// amCharts
import * as am5 from "@amcharts/amcharts5";
import * as am5map from "@amcharts/amcharts5/map";
import am5geodata_worldLow from "@amcharts/amcharts5-geodata/worldLow";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";

// DataTables
import DataTable from "datatables.net-react";
import DT from "datatables.net-bs5";
import "datatables.net-buttons-bs5";
import "datatables.net-buttons/js/buttons.html5.mjs";
import "datatables.net-buttons/js/buttons.print.mjs";
import jszip from "jszip";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
// Icons and Styles
import "../styles/analyticsreport.css";
import { Camera, LogOut, Mail, Send } from "lucide-react";

// Configuration
window.JSZip = jszip;
DataTable.use(DT);

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
  ChartDataLabels,
  MatrixController,
  MatrixElement
);

if (pdfFonts && pdfFonts.pdfMake) {
  pdfMake.vfs = pdfFonts.pdfMake.vfs;
}

// 1. Chart Style definitions (Same as HTML)
const trendStyles = {
  Critical: { border: "#e74c3c", bg: "rgba(231,76,60,0.3)" }, // Red
  High: { border: "#f39c12", bg: "rgba(243,156,18,0.3)" }, // Orange
  Medium: { border: "#3498db", bg: "rgba(52,152,219,0.3)" }, // Blue
  Low: { border: "#2ecc71", bg: "rgba(46,204,113,0.3)" }, // Green
};

const auditeeChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  layout: {
    padding: {
      top: 35, // Space for labels
    },
  },
  plugins: {
    legend: { display: false },
    tooltip: { enabled: true },
    datalabels: {
      display: true,
      anchor: "end",
      align: "top",
      color: "#444",
      font: {
        weight: "bold",
        size: 12,
      },
      formatter: (value) => value.toLocaleString(),
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: { display: true, drawBorder: false },
      ticks: {
        callback: (value) => value.toLocaleString(),
      },
    },
    x: {
      grid: { display: false },
    },
  },
};

const statusChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  layout: {
    padding: 10,
  },
  plugins: {
    legend: {
      position: "top",
      labels: { usePointStyle: true, padding: 10 },
    },
    datalabels: {
      color: "#fff",
      font: { weight: "bold", size: 14 },
      formatter: (value, ctx) => {
        // This calculates the percentage for the Doughnut chart
        let sum = 0;
        let dataArr = ctx.chart.data.datasets[0].data;
        dataArr.map((data) => {
          sum += data;
        });
        let percentage = ((value * 100) / sum).toFixed(0) + "%";
        return percentage;
      },
    },
  },
  // Adjust the size of the inner hole
  cutout: "60%",
};

// Options for "Pending by Risk Level" (Pie)
const riskChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  layout: {
    padding: 10,
  },
  plugins: {
    legend: {
      position: "right", // Legend moved to the right as per image 2
      labels: { padding: 10, usePointStyle: true },
    },
    datalabels: {
      color: "#fff1f1ff",
      font: { weight: "bold", size: 15 },
      formatter: (value) => value, // Shows raw numbers as per image 2
    },
  },
};

const verdictChartOptions = {
  responsive: true,
  maintainAspectRatio: false, // Set to false to allow the height wrapper to control size
  plugins: {
    legend: {
      position: "top",
      labels: {
        usePointStyle: true,
        boxWidth: 10,
        padding: 15,
        font: { size: 12 },
      },
    },
    datalabels: {
      color: "#fff", // White text so it's readable
      font: { weight: "bold", size: 16 },
      formatter: (value) => value, // Shows the raw number (e.g., 2 or 3)
    },
  },
};

const AnalyticsReport = () => {
  const EXCEL_FALLBACK = [
    { city: "CHANDIGARH", value: 57 },
    { city: "KURDUWADI", value: 1 },
    { city: "INDORE", value: 29 },
    { city: "KAPURTHALA", value: 1 },
    { city: "ANAND", value: 1 },
    { city: "MYSORE", value: 41 },
    { city: "AHMEDABAD", value: 294 },
    { city: "BHOPAL", value: 21 },
    { city: "NILAMBAZAR", value: 1 },
    { city: "BALLABGARH", value: 1 },
    { city: "LUDHIANA", value: 52 },
    { city: "ANANTAPUR", value: 2 },
    { city: "DAMAN", value: 2 },
    { city: "KOLKATA", value: 245 },
    { city: "ANKLESHWAR", value: 1 },
    { city: "RAIGARH", value: 1 },
    { city: "NEW DELHI", value: 207 },
    { city: "NAVI MUMBAI", value: 48 },
    { city: "NARFARIDABAD", value: 1 },
    { city: "COIMBATORE", value: 73 },
    { city: "CUTTACK", value: 1 },
    { city: "MORADABAD", value: 23 },
    { city: "JAGDALPUR", value: 2 },
    { city: "SILONI MEETPUR", value: 3 },
    { city: "MUMBAI", value: 355 },
    { city: "HOSHANGABAD", value: 1 },
    { city: "GHAZIABAD", value: 149 },
    { city: "Ranchi", value: 18 },
    { city: "AURANGABAD", value: 8 },
    { city: "RAJKOT", value: 18 },
    { city: "SOLAPUR", value: 19 },
    { city: "GULBARGA", value: 2 },
    { city: "GANDHINAGAR", value: 2 },
    { city: "DEHRADUN", value: 20 },
    { city: "BHUBANESHWAR", value: 39 },
    { city: "KANPUR", value: 67 },
    { city: "UDAIPUR", value: 5 },
    { city: "PALI", value: 1 },
    { city: "PURNIA", value: 3 },
    { city: "AGRA", value: 43 },
    { city: "DWARKA", value: 2 },
    { city: "IKKAPUR", value: 1 },
    { city: "MUNDAKA", value: 3 },
    { city: "GOA", value: 11 },
    { city: "PATNA", value: 55 },
    { city: "DHARAMSHALA", value: 2 },
    { city: "AMBALA", value: 4 },
    { city: "MEERUT", value: 36 },
    { city: "ALIGARH", value: 11 },
    { city: "BANGALORE", value: 411 },
    { city: "BHILAI", value: 3 },
    { city: "FARIDABAD", value: 87 },
    { city: "GAYA", value: 3 },
    { city: "TRICHY", value: 10 },
    { city: "GUNTUR", value: 6 },
    { city: "PUNE", value: 245 },
    { city: "GUWAHATI", value: 27 },
    { city: "MORBI", value: 1 },
    { city: "THANE", value: 37 },
    { city: "BAREILLY", value: 9 },
    { city: "JABALPUR", value: 5 },
    { city: "JAGRAON", value: 1 },
    { city: "RAMPUR", value: 6 },
    { city: "ROHTAK", value: 5 },
    { city: "JODHPUR", value: 8 },
    { city: "SONIPAT", value: 6 },
    { city: "REWARI", value: 2 },
    { city: "PANIPAT", value: 9 },
    { city: "HISAR", value: 3 },
    { city: "KURUKSHETRA", value: 1 },
    { city: "KARNAL", value: 6 },
    { city: "JAMMU", value: 14 },
    { city: "PANCHKULA", value: 1 },
    { city: "YAMUNANAGAR", value: 3 },
    { city: "AMRITSAR", value: 17 },
    { city: "SRINAGAR", value: 3 },
    { city: "NOIDA", value: 206 },
    { city: "RUDRAPUR", value: 1 },
    { city: "PATIALA", value: 6 },
    { city: "BHIWANI", value: 1 },
    { city: "JALANDHAR", value: 7 },
    { city: "BATHINDA", value: 3 },
    { city: "RAIPUR", value: 10 },
    { city: "VISHAKHAPATNAM", value: 30 },
    { city: "KANJIRAPALLY", value: 1 },
    { city: "RUPNAGAR", value: 1 },
    { city: "JAIPUR", value: 65 },
    { city: "VARANASI", value: 40 },
    { city: "KADAPA", value: 1 },
    { city: "TIRUNELVELI", value: 4 },
    { city: "RAEBARIELY", value: 1 },
    { city: "ERODE", value: 1 },
    { city: "CUTTAK", value: 1 },
    { city: "ERNAKULAM", value: 45 },
    { city: "BHIWANDI", value: 3 },
    { city: "KOTA", value: 5 },
    { city: "BHAVNAGAR", value: 3 },
    { city: "TANDA", value: 1 },
    { city: "HALDWANI", value: 2 },
    { city: "PONDICHERRY", value: 3 },
    { city: "GONDIA", value: 1 },
    { city: "ANANTNAG", value: 1 },
    { city: "JAMNAGAR", value: 4 },
    { city: "KANNUR", value: 12 },
    { city: "KASARGOD", value: 3 },
    { city: "ALLEPPEY", value: 4 },
    { city: "GURGAON", value: 165 },
    { city: "TIRUPATI", value: 10 },
    { city: "VADODARA", value: 62 },
    { city: "HYDERABAD", value: 302 },
    { city: "TRIVANDRUM", value: 15 },
    { city: "CHINCHWAD", value: 2 },
    { city: "NASHIK", value: 44 },
    { city: "MADURAI", value: 10 },
    { city: "KARAIKAL", value: 1 },
    { city: "SIVAKASI", value: 1 },
    { city: "SALEM", value: 15 },
    { city: "VIRUDHUNAGAR", value: 1 },
    { city: "VIZIANAGARAM", value: 2 },
    { city: "DHULE", value: 4 },
    { city: "NADIAD", value: 3 },
    { city: "TUMKUR", value: 3 },
    { city: "SRISAILAM", value: 1 },
    { city: "TIRUCHENGODE", value: 1 },
    { city: "MANGALORE", value: 9 },
    { city: "SURAT", value: 57 },
    { city: "WARANGAL", value: 6 },
    { city: "AHMADNAGAR", value: 4 },
    { city: "RAJAHMUNDRY", value: 4 },
    { city: "HUBLI", value: 5 },
    { city: "NAGPUR", value: 37 },
    { city: "TUTICORIN", value: 3 },
    { city: "MORADABA", value: 1 },
    { city: "SILIGURI", value: 16 },
    { city: "REWA", value: 1 },
    { city: "GANDHIDHAM", value: 2 },
    { city: "UTTARAKHAND", value: 1 },
    { city: "KARUR", value: 1 },
    { city: "TIRUPUR", value: 11 },
    { city: "COCHIN", value: 15 },
    { city: "KOLLAM", value: 6 },
    { city: "KOTTAYAM", value: 8 },
    { city: "PALAKKAD", value: 6 },
    { city: "CALICUT", value: 15 },
    { city: "KALYAN", value: 5 },
    { city: "LONAVALA", value: 1 },
    { city: "BHIWANI(R)", value: 1 },
    { city: "NAVI-MUMBAI", value: 3 },
    { city: "NASIK", value: 3 },
    { city: "PANCHGANI", value: 1 },
    { city: "RAIGAD", value: 2 },
    { city: "RATNAGIRI", value: 2 },
    { city: "SANGLI", value: 2 },
    { city: "SATARA", value: 3 },
    { city: "THANE(W)", value: 1 },
    { city: "VAPI", value: 3 },
    { city: "VIRAR", value: 2 },
    { city: "AMALNER", value: 1 },
    { city: "BHIWANDI(THANE)", value: 1 },
    { city: "JALGAON", value: 11 },
    { city: "KALYAN(W)", value: 1 },
    { city: "NANDED", value: 1 },
    { city: "CHALISGAON", value: 1 },
    { city: "NASIK(W)", value: 2 },
    { city: "MANMAD", value: 1 },
    { city: "MEHSANA", value: 1 },
    { city: "SURAT(WEST)", value: 1 },
    { city: "TARAPUR", value: 1 },
    { city: "RAMESWARAM", value: 1 },
    { city: "BANGALORE (URBAN)", value: 3 },
    { city: "PACHORA", value: 1 },
    { city: "MUMBAI(NAV-IMU)", value: 1 },
    { city: "BANGALORE(RURAL)", value: 1 },
    { city: "BELGAUM", value: 2 },
    { city: "GOKAK", value: 1 },
    { city: "KHANDWA", value: 2 },
    { city: "AKOLA", value: 2 },
    { city: "JANJGIR-CHAMPA", value: 1 },
    { city: "MIRA ROAD", value: 3 },
    { city: "CHENGALPATTU", value: 1 },
    { city: "AMBUR", value: 1 },
    { city: "CHENNAI", value: 218 },
    { city: "PARRYS", value: 1 },
    { city: "ANANTHA PURA", value: 1 },
    { city: "BARAMULLA", value: 1 },
    { city: "JALANDHAR CITY", value: 1 },
    { city: "CALICUT CITY", value: 1 },
    { city: "COCHIN CITY", value: 1 },
    { city: "ERNAKULAM CITY", value: 1 },
    { city: "KOTTAYAM CITY", value: 1 },
    { city: "PUSHPAGIRI", value: 1 },
    { city: "PUDUKKAD", value: 1 },
    { city: "TANUR", value: 1 },
    { city: "THAVANUR", value: 1 },
    { city: "MAVOOR", value: 1 },
    { city: "KOZIKODE", value: 2 },
    { city: "Vallikunnu", value: 1 },
    { city: "Vengara", value: 1 },
    { city: "AMBALA CITY", value: 1 },
    { city: "BATHINDA CITY", value: 1 },
    { city: "KALYAN CITY", value: 1 },
    { city: "KASARGOD (KERALA)", value: 1 },
    { city: "KARNAL CITY", value: 1 },
    { city: "MADURAI CITY", value: 1 },
    { city: "Noida", value: 3 },
    { city: "SURAT CITY", value: 1 },
    { city: "LUDHIANA CITY", value: 1 },
    { city: "Nagpur", value: 3 },
    { city: "UMARIA", value: 1 },
    { city: "Chandigarh", value: 10 },
    { city: "Ghaziabad", value: 13 },
    { city: "Gurgaon", value: 19 },
    { city: "NOIDA SECTOR 63", value: 1 },
    { city: "Chennai", value: 18 },
    { city: "PUNE CITY", value: 1 },
    { city: "HYDERABAD CITY", value: 6 },
    { city: "SASARAM", value: 1 },
    { city: "TARAN-TARAN", value: 1 },
    { city: "HOOGHLY", value: 1 },
    { city: "DARJEELING", value: 1 },
    { city: "BARRAKPORE", value: 1 },
    { city: "DURGAPUR", value: 2 },
    { city: "KALIA CHAK", value: 1 },
    { city: "KANCHRAPARA", value: 1 },
    { city: "KANKINARA", value: 1 },
    { city: "KARIMPUR", value: 1 },
    { city: "KOTWALI", value: 1 },
    { city: "NABADWIP", value: 1 },
    { city: "SILIGURI CIT", value: 1 },
    { city: "ASANSOL", value: 1 },
    { city: "HABRA", value: 1 },
    { city: "HOWRAH", value: 3 },
    { city: "KOLKATA CITY", value: 5 },
    { city: "KULPI", value: 1 },
    { city: "MADHYAMGRAM", value: 1 },
    { city: "PANIHATI", value: 1 },
    { city: "RANAGHAT", value: 1 },
    { city: "RANCHI CITY", value: 1 },
    { city: "GUWAHATI CITY", value: 1 },
    { city: "FARIDABAD CITY", value: 2 },
    { city: "PATNA CITY", value: 1 },
    { city: "SILCHAR", value: 1 },
    { city: "SRIKAKULAM", value: 2 },
    { city: "MUZAFFARPUR", value: 3 },
    { city: "COIMBATORE CITY", value: 1 },
    { city: "HUBBALLI", value: 1 },
    { city: "BELAGAVI", value: 1 },
    { city: "TIRUCHIRAPPALLI", value: 1 },
    { city: "GHAZIABAD CITY", value: 3 },
    { city: "PONDICHERY", value: 1 },
    { city: "HUBBALLI DHARWAD", value: 1 },
    { city: "MAKHU", value: 1 },
    { city: "FATEHABAD", value: 1 },
    { city: "PALWAL", value: 2 },
    { city: "MOGA", value: 2 },
    { city: "NARNAUL", value: 1 },
    { city: "SIRSA", value: 1 },
    { city: "NAVIMUMBAI", value: 1 },
    { city: "JALANDHAR (RURAL)", value: 1 },
    { city: "DISTRICT SAS NAGAR", value: 1 },
    { city: "YAMUNANAGAR DISTRICT", value: 1 },
    { city: "MUNDAKA (DELHI)", value: 4 },
    { city: "BADDOPUR", value: 1 },
    { city: "MALAPPURAM", value: 41 },
    { city: "KODIYATHUR", value: 1 },
    { city: "KONDOTTY", value: 2 },
    { city: "KUTTIPPALA", value: 1 },
    { city: "CHANGARAM KALATHUR", value: 1 },
    { city: "THALAKKULATHUR", value: 2 },
    { city: "KAKKANCHERY", value: 2 },
    { city: "KADAMPUZHA", value: 1 },
    { city: "VELLODA", value: 1 },
    { city: "KOTTAKKAL", value: 4 },
    { city: "PONNANI", value: 1 },
    { city: "TIRUR", value: 3 },
    { city: "MANJERI", value: 3 },
    { city: "PERITHALMANNA", value: 2 },
    { city: "CHEMANCHERY", value: 1 },
    { city: "VAIKKARA", value: 2 },
    { city: "CHERPULASSERY", value: 1 },
    { city: "MAMBARAM", value: 1 },
    { city: "PERINTHALMANNA", value: 1 },
    { city: "KADALUNDI", value: 2 },
    { city: "PALLIKKAL", value: 1 },
    { city: "KUNNAMANGALAM", value: 1 },
    { city: "KAVUMMANNAM", value: 1 },
    { city: "MANKADA", value: 1 },
    { city: "VATTAMKULAM", value: 1 },
    { city: "WANDOOR", value: 1 },
    { city: "NILAMBUR", value: 1 },
    { city: "VENGARA", value: 1 },
    { city: "ALA", value: 1 },
    { city: "ALLEPPEY / ALAPPUZHA", value: 1 },
    { city: "CHERUTHANA", value: 1 },
    { city: "ERATTUPETTA", value: 1 },
    { city: "ETTUMANOOR", value: 1 },
    { city: "KARUKACHAL", value: 1 },
    { city: "KOOVAPPALLY", value: 1 },
    { city: "MUTHOOR", value: 1 },
    { city: "MUVATTUPUZHA", value: 1 },
    { city: "PAIPPAD", value: 1 },
    { city: "PALA", value: 1 },
    { city: "PALAI", value: 1 },
    { city: "PARATHOD", value: 1 },
    { city: "PIRAVOM", value: 1 },
    { city: "PLASSANEE", value: 1 },
    { city: "PONKUNNAM", value: 1 },
    { city: "RANNI", value: 1 },
    { city: "THIRUVALLA", value: 1 },
    { city: "TIRUVALLA", value: 1 },
    { city: "AYROOR", value: 1 },
    { city: "THODUPUZHA", value: 1 },
    { city: "CHEMPAKAPARA", value: 1 },
    { city: "ARAKKUNNAM", value: 1 },
    { city: "CHENKAL", value: 1 },
    { city: "CHEPPAD", value: 2 },
    { city: "CHENGANNUR", value: 1 },
    { city: "CHERTHALA", value: 2 },
    { city: "CHOTTANIKKARA", value: 1 },
    { city: "ERNNAKULAM", value: 1 },
    { city: "GURUVAYUR", value: 1 },
    { city: "KARUNAGAPPALLY", value: 1 },
    { city: "KARUVELIPADY", value: 1 },
    { city: "KAYAMKULAM", value: 1 },
    { city: "KAZHAKOOTAM", value: 1 },
    { city: "KOLLAYIL", value: 1 },
    { city: "KOZHENCHERRY", value: 1 },
    { city: "KOZHIKODE", value: 1 },
    { city: "MALA", value: 1 },
    { city: "MANNANCHERY", value: 1 },
    { city: "MANNAR", value: 1 },
    { city: "MANRO THURUTHU", value: 1 },
    { city: "MARADU", value: 1 },
    { city: "NEDUMANGAD", value: 1 },
    { city: "NEERETTUPURAM", value: 1 },
    { city: "PALLAM", value: 1 },
    { city: "PANDALAM", value: 1 },
    { city: "PATHANAMTHITTA", value: 1 },
    { city: "PAYYANUR", value: 1 },
    { city: "PERUMBAVOOR", value: 1 },
    { city: "PIRAVOM THALUK", value: 1 },
    { city: "POOCHAKKAL", value: 1 },
    { city: "PUNALUR", value: 1 },
    { city: "VAIKOM", value: 1 },
    { city: "VARKALA", value: 1 },
    { city: "VIYYUR", value: 1 },
    { city: "KANNUR CITY", value: 1 },
    { city: "KARUVANCHAL", value: 1 },
    { city: "THRISSUR", value: 1 },
    { city: "KOVILPATTI", value: 1 },
    { city: "SIVAKASI CITY", value: 1 },
    { city: "WEST GODAVARI", value: 1 },
    { city: "KARUNAGAPPALLI /KOLLAM", value: 1 },
    { city: "SILIGURI CITY", value: 1 },
    { city: "KOTTAKAL", value: 1 },
    { city: "ERNAKULM", value: 1 },
    { city: "GURUDAS CAMP", value: 2 },
    { city: "PUDUKKAD PANCHAYATH", value: 1 },
    { city: "KAKKANAD", value: 1 },
    { city: "ERNAKULAM KERALA", value: 1 },
    { city: "JADCHERLA", value: 2 },
    { city: "FARUKH NAGAR", value: 1 },
    { city: "ASANGAON", value: 1 },
    { city: "PITHAMPUR", value: 4 },
    { city: "CHANGRAN ( KATHUA )", value: 1 },
    { city: "BOKARO, JHARKHAND", value: 1 },
    { city: "THRIPPUNITHURA", value: 1 },
    { city: "NORTH 24 PARGANAS", value: 1 },
    { city: "JODHPUR (RAJ)", value: 2 },
    { city: "COONOOR", value: 1 },
    { city: "BOKARO", value: 1 },
    { city: "ASHOK NAGAR", value: 1 },
    { city: "ARDHAPUR", value: 1 },
    { city: "NARSAPUR", value: 1 },
    { city: "MORADABAD CITY", value: 1 },
    { city: "CHENNAI NORTH", value: 1 },
    { city: "GREATER NOIDA", value: 2 },
    { city: "THANE EAST", value: 1 },
    { city: "VAPI", value: 22 },
    { city: "NAGPUR", value: 3 },
    { city: "AMBATTUR", value: 1 },
    { city: "HYDERABAD (SECUNDERABAD)", value: 1 },
    { city: "SOUTH DELHI", value: 1 },
    { city: "NIZAMABAD", value: 2 },
    { city: "BIJNOR", value: 15 },
  ];
  const navigate = useNavigate();

  const handleLogout = () => {
    // Clear your specific auth keys here
    localStorage.removeItem("authToken");
    sessionStorage.clear();
    navigate("/login");
  };
  const downloadRef = useRef(null);
  const tableContainerRef = useRef(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [emailData, setEmailData] = useState({ to: "", subject: "", body: "" });

  const [filters, setFilters] = useState({
    org: "all",
    location: "all",
    risk: "all",
    status: "all",
    auditee: "all",
    insight: "all",
    from_date: "",
    to_date: "",
  });

  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:8080";

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(filters).toString();
      const res = await axios.get(`${apiBase}/report?${params}`, {
        withCredentials: true,
      });
      setData(res.data);
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  // Event Delegation for Table Buttons
  useEffect(() => {
    const handleTableClick = (e) => {
      const reviewBtn = e.target.closest(".btn-review");
      if (reviewBtn) {
        navigate(`/auditor_action/${reviewBtn.getAttribute("data-id")}`);
        return;
      }
      const emailBtn = e.target.closest(".btn-email");
      if (emailBtn) {
        openEmailModal(
          emailBtn.getAttribute("data-auditee"),
          emailBtn.getAttribute("data-obj"),
          emailBtn.getAttribute("data-cnt")
        );
      }
    };
    const container = tableContainerRef.current;
    if (container) container.addEventListener("click", handleTableClick);
    return () => container?.removeEventListener("click", handleTableClick);
  }, [data, navigate]);

  useLayoutEffect(() => {
    let rootElement = document.getElementById("amchartdiv");
    if (!data || !rootElement) return;

    // --- COORDINATE LOOKUP TABLE for your dataset ---
    const cityCoords = {
      BANGALORE: { lat: 12.9716, lon: 77.5946 },
      MUMBAI: { lat: 19.076, lon: 72.8777 },
      HYDERABAD: { lat: 17.385, lon: 78.4867 },
      AHMEDABAD: { lat: 23.0225, lon: 72.5714 },
      KOLKATA: { lat: 22.5726, lon: 88.3639 },
      PUNE: { lat: 18.5204, lon: 73.8567 },
      CHENNAI: { lat: 13.0827, lon: 80.2707 },
      "NEW DELHI": { lat: 28.6139, lon: 77.209 },
      NOIDA: { lat: 28.5355, lon: 77.391 },
      GURGAON: { lat: 28.4595, lon: 77.0266 },
      GHAZIABAD: { lat: 28.6692, lon: 77.4538 },
      COIMBATORE: { lat: 11.0168, lon: 76.9558 },
      LUDHIANA: { lat: 30.901, lon: 75.8573 },
      SURAT: { lat: 21.1702, lon: 72.8311 },
      JAIPUR: { lat: 26.9124, lon: 75.7873 },
      VADODARA: { lat: 22.3072, lon: 73.1812 },
      CHANDIGARH: { lat: 30.7333, lon: 76.7794 },
      INDORE: { lat: 22.7196, lon: 75.8577 },
      NAGPUR: { lat: 21.1458, lon: 79.0882 },
      THANE: { lat: 19.2183, lon: 72.9781 },
      PATNA: { lat: 25.5941, lon: 85.1376 },
      MYSORE: { lat: 12.2958, lon: 76.6394 },
      VARANASI: { lat: 25.3176, lon: 82.9739 },
      BHUBANESHWAR: { lat: 20.2961, lon: 85.8245 },
      VISHAKHAPATNAM: { lat: 17.6868, lon: 83.2185 },
      MALAPPURAM: { lat: 11.0735, lon: 76.074 },
      VAPI: { lat: 20.3717, lon: 72.9103 },
    };

    const root = am5.Root.new("amchartdiv");
    root.setThemes([am5themes_Animated.new(root)]);

    const chart = root.container.children.push(
      am5map.MapChart.new(root, {
        panX: "translateX",
        panY: "translateY",
        projection: am5map.geoMercator(),
        wheelY: "zoom",
        wheelX: "none",
        maxZoomLevel: 32,
        minZoomLevel: 1,
      })
    );

    const polygonSeries = chart.series.push(
      am5map.MapPolygonSeries.new(root, {
        geoJSON: am5geodata_worldLow,
        exclude: ["AQ"],
      })
    );

    polygonSeries.mapPolygons.template.setAll({
      fill: am5.color(0xeeeeee),
      stroke: am5.color(0xffffff),
      strokeWidth: 0.5,
    });

    const bubbleSeries = chart.series.push(
      am5map.MapPointSeries.new(root, {
        valueField: "value",
        calculateAggregates: true,
      })
    );

    const circleTemplate = am5.Template.new({});
    bubbleSeries.bullets.push(() => {
      return am5.Bullet.new(root, {
        sprite: am5.Circle.new(
          root,
          {
            radius: 5,
            fillOpacity: 0.6,
            strokeWidth: 1,
            stroke: am5.color(0xffffff),
            tooltip: am5.Tooltip.new(root, { labelText: "{name}: {value}" }),
            templateField: "circleTemplate",
          },
          circleTemplate
        ),
      });
    });

    bubbleSeries.set("heatRules", [
      {
        target: circleTemplate,
        min: 4,
        max: 20,
        key: "radius",
        dataField: "value",
      },
    ]);

    const colors = am5.ColorSet.new(root, { step: 2 });

    // --- DATA PROCESSING LOGIC ---
    const bubbleData = EXCEL_FALLBACK.map((item, idx) => {
      const city = item.city.toUpperCase();

      // 1. Check if we have exact coordinates
      let lat, lon;
      if (cityCoords[city]) {
        lat = cityCoords[city].lat;
        lon = cityCoords[city].lon;
      } else {
        // 2. If city not in list, anchor to Nagpur (Center of India) with tiny random offset
        // This ensures unknown cities still land on India's landmass
        lat = 21.14 + (Math.random() - 0.5) * 8;
        lon = 79.08 + (Math.random() - 0.5) * 8;
      }

      return {
        geometry: { type: "Point", coordinates: [lon, lat] },
        name: city,
        value: item.value,
        circleTemplate: { fill: colors.getIndex(idx % 15) },
      };
    });

    bubbleSeries.data.setAll(bubbleData);

    // Position the map on India
    chart.set("homeGeoPoint", { latitude: 22, longitude: 78 });
    chart.set("homeZoomLevel", 4.5);
    chart.appear(1000, 100);

    return () => root.dispose();
  }, [data]);
  const handleDownload = () => {
    html2canvas(downloadRef.current, { scale: 2, useCORS: true }).then(
      (canvas) => {
        const link = document.createElement("a");
        link.download = "audit-command-center.png";
        link.href = canvas.toDataURL();
        link.click();
      }
    );
  };

  const openEmailModal = (auditee, objective, count) => {
    setEmailData({
      to: `${auditee}@lenovo.com`,
      subject: `Reminder: Action Required - ${objective}`,
      body: `Dear ${auditee},\n\nYou have ${count} pending items for ${objective}.`,
    });
    setShowModal(true);
  };

  if (loading || !data)
    return <div className="p-5 text-center">Data Loading...</div>;

  const isVerdictEmpty =
    !data.verdict_data?.data ||
    data.verdict_data.data.length === 0 ||
    data.verdict_data.data.every((val) => val === 0);

  // 2. DATA GENERATOR (If API fails to provide data)
  const getRiskTrendData = () => {
    // If the API hasn't loaded data yet, use this mock data
    const labels = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    // helper to get data or generate random for testing
    const getValues = (apiDs) => {
      if (apiDs && apiDs.data && apiDs.data.some((v) => v > 0))
        return apiDs.data;
      // If data is all 0s, generate random numbers between 10 and 60 for testing
      return labels.map(() => Math.floor(Math.random() * 50) + 10);
    };

    return {
      labels,
      datasets: [
        {
          label: "Critical",
          data: getValues(
            data.risk_trend_data?.datasets?.find((d) => d.label === "Critical")
          ),
          borderColor: "#e74c3c",
          backgroundColor: "rgba(231, 76, 60, 0.3)", // Shaded area
          fill: true, // Fill the area
          tension: 0.4, // Smooth curve
          pointRadius: 4,
        },
        {
          label: "High",
          data: getValues(
            data.risk_trend_data?.datasets?.find((d) => d.label === "High")
          ),
          borderColor: "#f39c12",
          backgroundColor: "rgba(243, 156, 18, 0.3)",
          fill: true,
          tension: 0.4,
          pointRadius: 4,
        },
        {
          label: "Medium",
          data: getValues(
            data.risk_trend_data?.datasets?.find((d) => d.label === "Medium")
          ),
          borderColor: "#3498db",
          backgroundColor: "rgba(52, 152, 219, 0.3)",
          fill: true,
          tension: 0.4,
          pointRadius: 4,
        },
      ],
    };
  };

  return (
    <div className="analytics-container" ref={downloadRef}>
      <header className="dashboard-header">
        <div className="d-flex align-items-center">
          <img src="/images/logo.png" alt="Logo" className="header-logo" />
          <div>
            <h1 className="h4 mb-0 fw-bold">Audit Command Center</h1>
            <p className="mb-0 text-muted small">
              Live Status of Exceptions & Closure Action
            </p>
          </div>
        </div>
        <div className="d-flex gap-2">
          <button
            onClick={handleDownload}
            className="btn btn-success btn-sm px-3"
          >
            <Camera size={16} className="me-2" />
            Download Page
          </button>

          {/* UPDATED BUTTON */}
          <button onClick={handleLogout} className="btn btn-danger btn-sm px-3">
            <LogOut size={16} className="me-2" />
            Logout
          </button>
        </div>
      </header>

      <div className="container-fluid px-4">
        {/* KPI Row */}
        <div className="row row-cols-1 row-cols-sm-2 row-cols-md-4 row-cols-xl-7 g-2 mb-4">
          <KPICard
            title="#Auditees"
            value={data.kpi_data.auditees}
            color="purple"
          />
          <KPICard
            title="#Exceptions"
            value={data.kpi_data.exceptions}
            color="gradient1"
          />
          <KPICard
            title="#Closed Items"
            value={data.kpi_data.closed}
            color="green"
          />
          <KPICard
            title="#Auditee Pending" // Shortened for better fit
            value={data.kpi_data.open}
            color="yellow"
          />
          <KPICard
            title="#Auditor Pending" // Shortened for better fit
            value={data.kpi_data.pending_auditor}
            color="orange"
          />
          <KPICard
            title="#Critical Risk"
            value={data.kpi_data.critical_risk}
            color="red"
          />
          <KPICard
            title="#High Risk"
            value={data.kpi_data.high_risk}
            color="orange"
          />
        </div>
        {/* Filters */}
        <div className="card filter-card mb-4 border-0 shadow-sm p-3">
          <div className="row g-2 align-items-end">
            <FilterSelect
              label="Entity"
              options={data.filter_options.organizations}
              value={filters.org}
              onChange={(v) => setFilters({ ...filters, org: v })}
              colClass="col-xl-2 col-md-4"
            />
            <FilterSelect
              label="Region"
              options={data.filter_options.locations}
              value={filters.location}
              onChange={(v) => setFilters({ ...filters, location: v })}
              colClass="col-xl-2 col-md-4"
            />
            <FilterSelect
              label="Risk Level"
              options={data.filter_options.risks}
              value={filters.risk}
              onChange={(v) => setFilters({ ...filters, risk: v })}
              colClass="col-xl-1 col-md-4"
            />
            <FilterSelect
              label="Status"
              options={data.filter_options.statuses}
              value={filters.status}
              onChange={(v) => setFilters({ ...filters, status: v })}
              colClass="col-xl-1 col-md-4"
            />
            <FilterSelect
              label="Auditee"
              options={data.filter_options.auditees}
              value={filters.auditee}
              onChange={(v) => setFilters({ ...filters, auditee: v })}
              colClass="col-xl-1 col-md-4"
            />
            <FilterSelect
              label="Insight"
              options={data.filter_options.insights}
              value={filters.insight}
              onChange={(v) => setFilters({ ...filters, insight: v })}
              colClass="col-xl-1 col-md-4"
            />
            <div className="col-xl-1 col-md-4">
              <label className="form-label small fw-bold mb-1">From</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={filters.from_date}
                onChange={(e) =>
                  setFilters({ ...filters, from_date: e.target.value })
                }
              />
            </div>
            <div className="col-xl-1 col-md-4">
              <label className="form-label small fw-bold mb-1">To</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={filters.to_date}
                onChange={(e) =>
                  setFilters({ ...filters, to_date: e.target.value })
                }
              />
            </div>
            <div className="col-xl-1 col-md-12">
              <button
                onClick={fetchReport}
                className="btn btn-primary btn-sm w-100 fw-bold"
              >
                Go
              </button>
            </div>
          </div>
        </div>

        <div className="row">
          <ChartBox title="Pending Items by Entity">
            <Bar data={data.entity_chart_data} options={chartOptionsStacked} />
          </ChartBox>
          <ChartBox title="Pending Items by Auditee">
            <Bar
              data={{
                labels: data.auditee_data.labels,
                datasets: [
                  {
                    data: data.auditee_data.data,
                    // Map multiple colors to the bars
                    backgroundColor: [
                      "#2980b9", // Blue
                      "#8e44ad", // Purple
                      "#27ae60", // Green
                      "#f39c12", // Orange
                      "#e74c3c", // Red
                      "#1abc9c", // Teal
                    ],
                    borderRadius: 4,
                  },
                ],
              }}
              options={auditeeChartOptions} // Now defined in scope
            />
          </ChartBox>{" "}
        </div>

        <div className="row">
          <ChartBox title="Items by Status">
            <div
              style={{
                height: "300px",
                width: "100%",
              }}
            >
              <Doughnut
                data={{
                  labels: data.status_data.labels,
                  datasets: [
                    {
                      data: data.status_data.data,
                      backgroundColor: ["#0d6efd", "#198754"],
                      borderColor: "#fff",
                      borderWidth: 2,
                    },
                  ],
                }}
                options={statusChartOptions}
              />
            </div>
          </ChartBox>
          <ChartBox title="Pending by Risk Level">
            <div
              style={{
                height: "300px",
                width: "100%",
              }}
            >
              <Pie
                data={{
                  labels: data.risk_chart_data.labels,
                  datasets: [
                    {
                      data: data.risk_chart_data.data,
                      backgroundColor: ["red", "orange", "blue", "green"],
                      borderColor: "#ffffffff", // White border between slices
                      borderWidth: 2,
                    },
                  ],
                }}
                options={riskChartOptions}
              />
            </div>
          </ChartBox>
        </div>

        <div className="row">
          <ChartBox title="Risk Heatmap as on Date">
            <RiskMatrix />
          </ChartBox>
          <ChartBox title="Ageing of Open Items">
            <Bar
              data={{
                labels: data.aging_chart_data.labels,
                datasets: [
                  {
                    data: data.aging_chart_data.data,
                    backgroundColor: [
                      "#198754", // Green (< 30 Days)
                      "#ffc107", // Yellow (30-60 Days)
                      "#fd7e14", // Orange (61-90 Days)
                      "#dc3545", // Red (> 90 Days)
                    ],
                    borderRadius: 5, // Add a slight rounding to the bars too
                    barThickness: 40, // Adjust thickness to match Image 1
                  },
                ],
              }}
              options={chartOptionsHorizontal}
            />
          </ChartBox>
        </div>

        <div className="row">
          <ChartBox title="Top 5 Insights (Open Items)">
            <Bar
              data={{
                labels: data.top_insights_chart_data.labels,
                datasets: [
                  {
                    label: "Open Items",
                    data: data.top_insights_chart_data.data,
                    backgroundColor: "#8e44ad",
                  },
                ],
              }}
              options={chartOptionsHorizontal}
            />
          </ChartBox>

          <ChartBox title="Risk Trend">
            <Line
              data={getRiskTrendData()}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: "top" },
                  datalabels: {
                    display: true,
                    align: "top",
                    color: "#444",
                    font: { weight: "bold" },
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    suggestedMax: 90, // Forces the chart to have height even if data is low
                    grid: { color: "#f0f0f0" },
                  },
                  x: {
                    grid: { display: false },
                  },
                },
              }}
            />{" "}
          </ChartBox>
        </div>

        <div className="row">
          <ChartBox title="Auditor Verdict on Closed Items">
            <div
              style={{
                height: "300px",
                width: "100%",
                display: "flex",
                justifyContent: "center",
              }}
            >
              {isVerdictEmpty ? (
                <EmptyChartState message="No closed items found to display verdict" />
              ) : (
                <Pie
                  data={{
                    labels: data.verdict_data.labels,
                    datasets: [
                      {
                        data: data.verdict_data.data,
                        backgroundColor: ["#2ecc71", "#e74c3c"],
                        borderColor: "#fff",
                        borderWidth: 2,
                      },
                    ],
                  }}
                  options={verdictChartOptions}
                />
              )}
            </div>
          </ChartBox>{" "}
          <ChartBox title="Pending Items by Category">
            <Bar
              data={{
                labels: data.category_data.labels,
                datasets: [
                  {
                    label: "Pending Items",
                    data: data.category_data.data,
                    backgroundColor: "#1abc9c",
                  },
                ],
              }}
              options={chartOptionsHorizontal}
            />
          </ChartBox>
        </div>

        <div className="row mb-4">
          <div className="col-lg-12">
            <div className="card shadow-sm">
              <div className="card-header">Exception Spread by Region</div>
              <div className="card-body">
                {/* MATCH THIS ID */}
                <div id="amchartdiv" style={{ height: "420px" }} />
              </div>
            </div>
          </div>
        </div>
        <div className="row mb-4">
          <div className="col-lg-12">
            <div className="card shadow-sm">
              <div className="card-header">Audit Activity Calendar</div>
              <div
                className="card-body"
                style={{ height: "500px", overflowY: "auto" }}
              >
                <CalendarHeatmap />
              </div>
            </div>
          </div>
        </div>

        <div className="card shadow-sm mb-5 border-0">
          <div className="card-header d-flex justify-content-between align-items-center">
            Master Insight Status
            <div className="d-flex gap-3 text-dark small fw-normal">
              <span>
                <b>{data.kpi_data.auditees}</b> Auditees Assigned
              </span>
              <span>
                <b>{data.kpi_data.open}</b> Pending Auditee
              </span>
              <span>
                <b>{data.kpi_data.pending_auditor}</b> Pending Auditor
              </span>
            </div>
          </div>
          <div className="card-body" ref={tableContainerRef}>
            <DataTable
              data={data.table_data}
              columns={[
                { title: "Insight ID", data: "id" },
                { title: "Objective", data: "objective" },
                { title: "Exception", data: "exception" },
                { title: "Auditee", data: "auditee" },
                {
                  title: "Risk",
                  data: "risk",
                  render: (d) => {
                    if (d === "Critical") {
                      return `<span class = "badge bg-danger">${d}</span>`;
                    }
                    if (d === "High") {
                      return `<span class = "badge bg-warning text-dark">${d}</span>`;
                    }
                    if (d === "Low") {
                      return `<span class = "badge bg-success">${d}</span>`;
                    }
                    return `<span class = "badge bg-primary">${d}</span>`;
                  },
                },
                {
                  title: "Status",
                  data: "status",
                  render: (d) => {
                    if (d === "Completed") {
                      return `<span class="badge bg-success">${d}</span>`;
                    }
                    if (d === "Yet to Start") {
                      return `<span class="badge bg-secondary text-white">${d}</span>`;
                    }
                    return `<span class="badge bg-info">${d}</span>`;
                  },
                },
                { title: "Pending", data: "pending_count" },
                { title: "Done", data: "completed_count" },
                { title: "Due Date", data: "due_date_str" },
                {
                  title: "Overdue",
                  data: "overdue_days",
                  render: (d) =>
                    d > 0
                      ? `<span class="text-danger fw-bold">${d}</span>`
                      : `0`,
                },
                {
                  title: "Actions",
                  data: null,
                  render: (data, type, row) => `
                    <div class="d-flex gap-1">
                        <button class="btn btn-xs btn-primary btn-review" data-id="${row.file_id}">Review</button>
                        <button class="btn btn-xs btn-secondary btn-email" data-auditee="${row.auditee}" data-obj="${row.objective}" data-cnt="${row.pending_count}">Email</button>
                    </div>`,
                },
              ]}
              options={{
                dom: "Bfrtip",
                buttons: [
                  { extend: "copy", text: '<i class="far fa-copy"></i> Copy' },
                  {
                    extend: "csv",
                    text: '<i class="fas fa-file-csv"></i> CSV',
                  },
                  {
                    extend: "excel",
                    text: '<i class="far fa-file-excel"></i> Excel',
                  },
                  {
                    extend: "pdf",
                    text: '<i class="far fa-file-pdf"></i> PDF',
                  },
                  {
                    extend: "print",
                    text: '<i class="fas fa-print"></i> Print',
                  },
                ],
                pageLength: 10,
              }}
              className="table table-striped table-hover table-sm"
            />
          </div>
        </div>
      </div>

      {showModal && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog">
            <div className="modal-content shadow-lg border-0">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  <Mail size={18} className="me-2" /> Email Composer
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label small fw-bold">To:</label>
                  <input
                    className="form-control"
                    value={emailData.to}
                    readOnly
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold">Subject:</label>
                  <input
                    className="form-control"
                    value={emailData.subject}
                    readOnly
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold">Body:</label>
                  <textarea
                    className="form-control"
                    rows="5"
                    value={emailData.body}
                    onChange={(e) =>
                      setEmailData({ ...emailData, body: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowModal(false)}
                >
                  Close
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowModal(false)}
                >
                  <Send size={14} className="me-2" /> Send Email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const KPICard = ({ title, value, color }) => {
  return (
    <div className="col">
      <div className={`kpi-card kpi-${color} h-100`}>
        <div className="kpi-value">{value ?? 0}</div>
        <div className="kpi-title">{title}</div>
      </div>
    </div>
  );
};
const FilterSelect = ({ label, options, value, onChange, colClass }) => (
  <div className={colClass}>
    <label className="form-label small fw-bold mb-1">{label}</label>
    <select
      className="form-select form-select-sm"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="all">All</option>
      {options?.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  </div>
);
const ChartBox = ({ title, children }) => (
  <div className="col-xl-6 mb-4">
    <div className="card shadow-sm h-100">
      {/* Add the 'card-header' class which has your blue color/red border in analyticsreport.css */}
      <div className="card-header">{title}</div>
      <div className="card-body">
        <div
          className="chart-container"
          style={{ height: "350px", position: "relative" }}
        >
          {children}
        </div>
      </div>
    </div>
  </div>
);

const EmptyChartState = ({
  message = "No data available for the selected filters",
}) => (
  <div className="d-flex flex-column align-items-center justify-content-center h-100 text-muted">
    <div className="empty-state-icon mb-2">
      <svg
        width="64"
        height="64"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.3"
      >
        <path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path>
        <path d="M22 12A10 10 0 0 0 12 2v10z"></path>
      </svg>
    </div>
    <p className="small fw-medium mb-0">{message}</p>
    <span style={{ fontSize: "0.7rem", opacity: 0.6 }}>
      Try adjusting your filters
    </span>
  </div>
);

const RiskMatrix = () => {
  const riskLevels = ["Very Low", "Low", "Medium", "High", "Critical"];
  const colors = [
    ["#33691e", "#33691e", "#9ccc65", "#9ccc65", "#fbc02d"],
    ["#33691e", "#33691e", "#9ccc65", "#fbc02d", "#f57f17"],
    ["#33691e", "#33691e", "#fbc02d", "#f57f17", "#b71c1c"],
    ["#9ccc65", "#fbc02d", "#f57f17", "#b71c1c", "#b71c1c"],
    ["#fbc02d", "#f57f17", "#f57f17", "#b71c1c", "#b71c1c"],
  ];
  const heatmapData = [];
  for (let y = 0; y < 5; y++)
    for (let x = 0; x < 5; x++)
      heatmapData.push({
        x: riskLevels[x],
        y: riskLevels[4 - y],
        v: Math.floor(Math.random() * 20) + 5,
        color: colors[4 - y][x],
      });
  return (
    <BaseChart
      type="matrix"
      data={{
        datasets: [
          {
            data: heatmapData,
            backgroundColor: (c) => c.raw?.color,
            // borderRadius creates the rounded corners
            borderRadius: 8,
            // Subtracting from width/height creates the "gaps" between boxes
            width: ({ chart }) =>
              chart.chartArea ? chart.chartArea.width / 5 - 8 : 40,
            height: ({ chart }) =>
              chart.chartArea ? chart.chartArea.height / 5 - 8 : 40,
            datalabels: {
              color: "#fff",
              font: { weight: "bold", size: 14 },
              formatter: (v) => v.v,
            },
          },
        ],
      }}
      options={{
        maintainAspectRatio: false,
        scales: {
          x: {
            type: "category",
            labels: riskLevels,
            title: {
              display: true,
              text: "Likelihood",
              font: { weight: "bold" },
            },
            grid: { display: false },
          },
          y: {
            type: "category",
            labels: [...riskLevels].reverse(),
            offset: true,
            title: { display: true, text: "Impact", font: { weight: "bold" } },
            grid: { display: false },
          },
        },
        plugins: {
          legend: false,
          tooltip: {
            callbacks: {
              title: () => "",
              label: (context) => `Count: ${context.raw.v}`,
            },
          },
        },
      }}
    />
  );
};

const getStableValue = (year, month, day) => {
  const seed = year * 10000 + month * 100 + day;
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x); // value between 0–1
};

const CalendarHeatmap = () => {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const dayHeaders = ["S", "M", "T", "W", "T", "F", "S"];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [year, setYear] = useState(today.getFullYear());
  const getColor = (v) => {
    if (v > 0.85) return "#e74c3c";
    if (v > 0.6) return "#f1c40f";
    if (v > 0.2) return "#2ecc71";
    return "#ebedf0";
  };
  return (
    <>
      {/* ✅ Year Navigation Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <button
          className="btn btn-outline-secondary btn-sm"
          onClick={() => setYear(year - 1)}
        >
          ⬅ {year - 1}
        </button>

        <h6 className="mb-0 fw-bold">Audit Activity Calendar – {year}</h6>

        <button
          className="btn btn-outline-secondary btn-sm"
          onClick={() => setYear(year + 1)}
        >
          {year + 1} ➡
        </button>
      </div>

      <div id="calendar-heatmap-container">
        {months.map((m, i) => {
          const firstDay = new Date(year, i, 1).getDay();
          const daysInMonth = new Date(year, i + 1, 0).getDate();
          const cells = [];

          for (let j = 0; j < firstDay; j++) {
            cells.push(
              <div key={`empty-${j}`} className="day-cell empty"></div>
            );
          }

          for (let d = 1; d <= daysInMonth; d++) {
            const currentDate = new Date(year, i, d);
            let bgColor = "#ebedf0";
            let title = `${d} ${m}: 0 items`;

            // Only fill data for past/current days
            if (currentDate <= today && currentDate.getDay() !== 0) {
              const r = getStableValue(year, i + 1, d);
              bgColor = getColor(r);
              title = `${d} ${m}: ${Math.floor(r * 10)} items`;
            }

            cells.push(
              <div
                key={`day-${d}`}
                className="day-cell"
                style={{ backgroundColor: bgColor }}
                title={title}
              >
                {d}
              </div>
            );
          }

          return (
            <div key={m} className="month-grid">
              <div className="month-title">
                {m} {year}
              </div>
              <div className="day-headers">
                {dayHeaders.map((dh, idx) => (
                  <div key={idx} className="day-header">
                    {dh}
                  </div>
                ))}
              </div>
              <div className="day-grid">{cells}</div>
            </div>
          );
        })}
      </div>
    </>
  );
};
const chartOptionsStacked = {
  responsive: true,
  maintainAspectRatio: false,
  scales: { x: { stacked: true }, y: { stacked: true } },
};
const chartOptionsSimple = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: false },
};
const chartOptionsHorizontal = {
  indexAxis: "y",
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    datalabels: {
      display: true,
      // DYNAMIC COLOR: White if large (>100), Dark if small
      color: (context) => {
        const value = context.dataset.data[context.dataIndex];
        return value > 100 ? "#ffffff" : "#444444";
      },
      // ALWAYS ANCHOR TO THE TIP
      anchor: "end",
      // DYNAMIC ALIGN: 'start' (inside) if large, 'end' (outside) if small
      align: (context) => {
        const value = context.dataset.data[context.dataIndex];
        return value > 100 ? "start" : "end";
      },
      // DYNAMIC OFFSET: Adjust spacing for inside vs outside
      offset: (context) => {
        const value = context.dataset.data[context.dataIndex];
        return value > 100 ? 15 : 5;
      },
      font: {
        weight: "bold",
        size: 13,
      },
      formatter: (value) => value.toLocaleString(),
    },
  },
  scales: {
    x: {
      beginAtZero: true,
      // Ensure there is room on the right for outside labels
      suggestedMax: (context) => {
        // Auto-expand the scale so labels don't get cut off
        return Math.max(...context.chart.data.datasets[0].data) * 1.1;
      },
      grid: { color: "#f0f0f0" },
    },
    y: {
      grid: { display: false },
    },
  },
};
export default AnalyticsReport;
