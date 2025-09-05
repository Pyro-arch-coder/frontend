import React, { useState, useEffect, useRef } from "react";
import ReactECharts from "echarts-for-react";
import * as XLSX from 'xlsx';
import { Box, FormControl, InputLabel, Select, MenuItem, TextField, Button, Alert, CircularProgress, Typography, Paper, Grid } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import jsPDF from 'jspdf';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8081';

const SDashboard = () => {
  const [selectedBrgy, setSelectedBrgy] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateError, setDateError] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [acceptedUsers, setAcceptedUsers] = useState([]);
  const [monthlyPopulation, setMonthlyPopulation] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const chartsRef = useRef([]);
  const [beneficiariesData, setBeneficiariesData] = useState({
    beneficiaries: 0,
    nonBeneficiaries: 0
  });
  const [applicationStatusData, setApplicationStatusData] = useState({
    declined: 0,
    pending: 0,
    accepted: 0
  });

  const [ageData, setAgeData] = useState({
    highestAge: 0,
    lowestAge: 0,
    ageDistribution: []
  });
  
  const [childrenCountData, setChildrenCountData] = useState({
    childrenCountDistribution: []
  });
  
  // Add state for children age data
  const [childrenAgeData, setChildrenAgeData] = useState({
    ageGroups: {
      '0-5': 0,
      '6-12': 0,
      '13-17': 0,
      '18-21': 0,
      '22+': 0
    },
    rawData: []
  });
  
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  const [reportCount, setReportCount] = useState(() => {
    const count = parseInt(localStorage.getItem('superadmin_excel_count') || '0', 10);
    return isNaN(count) ? 0 : count;
  });
  const [reportLimitMessage, setReportLimitMessage] = useState('');
  const [exportFilter, setExportFilter] = useState('all');
  const [canExportPdf, setCanExportPdf] = useState(true);
  const [pdfCount, setPdfCount] = useState(() => {
    const count = parseInt(localStorage.getItem('superadmin_pdf_count') || '0', 10);
    return isNaN(count) ? 0 : count;
  });
  const [canExportExcel, setCanExportExcel] = useState(true);

  const barangays = [
    "All",
    "Adia",
    "Bagong Pook",
    "Bagumbayan",
    "Bubucal",
    "Cabooan",
    "Calangay",
    "Cambuja",
    "Coralan",
    "Cueva",
    "Inayapan",
    "Jose P. Laurel, Sr.",
    "Jose P. Rizal",
    "Juan Santiago",
    "Kayhacat",
    "Macasipac",
    "Masinao",
    "Matalinting",
    "Pao-o",
    "Parang ng Buho",
    "Poblacion Dos",
    "Poblacion Quatro",
    "Poblacion Tres",
    "Poblacion Uno",
    "Talangka",
    "Tungkod"
  ];

  // Mock data structure
  const dashboardData = {
    "All": {
      population: [43, 44, 46, 46, 48, 50, 51, 53, 54, 56, 57, 62],
      growth: [10, 12, 8, 15],
      distribution: [150, 80, 10],
      ageGroups: [25, 45, 30, 15, 10],
      employmentStatus: [120, 80],  // [Beneficiaries, Non-Beneficiaries]
      educationLevel: [30, 45, 55, 35],
      incomeDistribution: [20, 35, 45, 30, 10],
      applicationStatus: [150, 50, 30],
      assistanceTypes: [40, 35, 45, 30, 20]
    },
    "Adia": {
      population: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
      growth: [2, 3, 1, 4],
      distribution: [20, 10, 5],
      ageGroups: [5, 8, 6, 3, 2],
      employmentStatus: [15, 10],  // [Beneficiaries, Non-Beneficiaries]
      educationLevel: [5, 8, 10, 7],
      incomeDistribution: [3, 5, 7, 5, 2],
      applicationStatus: [20, 5, 3],
      assistanceTypes: [5, 4, 6, 4, 3]
    },
    "Bagong Pook": {
      population: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      growth: [1, 2, 1, 3],
      distribution: [15, 8, 4],
      ageGroups: [4, 7, 5, 2, 1],
      employmentStatus: [12, 8],  // [Beneficiaries, Non-Beneficiaries]
      educationLevel: [4, 6, 8, 5],
      incomeDistribution: [2, 4, 6, 4, 1],
      applicationStatus: [15, 4, 2],
      assistanceTypes: [4, 3, 5, 3, 2]
    }
  };

  // Add default data for other barangays
  barangays.forEach(brgy => {
    if (!dashboardData[brgy] && brgy !== "All") {
      dashboardData[brgy] = {
        population: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
        growth: [1, 2, 1, 2],
        distribution: [10, 5, 3],
        ageGroups: [3, 5, 4, 2, 1],
        employmentStatus: [8, 5, 3],
        educationLevel: [3, 4, 6, 3],
        incomeDistribution: [2, 3, 4, 3, 1],
        applicationStatus: [10, 3, 2],
        assistanceTypes: [3, 2, 4, 2, 1]
      };
    }
  });

  // Fetch accepted users data
  useEffect(() => {
    const fetchAcceptedUsers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('http://localhost:8081/accepted-users');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setAcceptedUsers(data);
      } catch (error) {
        console.error('Error fetching accepted users:', error);
        setError('Failed to load accepted users. Please make sure the backend server is running.');
        // Set some mock data for development
        setAcceptedUsers([
          { id: 1, name: "John Doe", accepted_at: "2024-03-30T10:00:00Z" },
          { id: 2, name: "Jane Smith", accepted_at: "2024-03-29T15:30:00Z" },
          { id: 3, name: "Mike Johnson", accepted_at: "2024-03-28T09:15:00Z" }
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAcceptedUsers();
  }, []);

  // Fetch monthly population data
  useEffect(() => {
    const fetchMonthlyPopulation = async () => {
      try {
        // Build the query string with filters
        let queryParams = [];
        if (selectedBrgy !== "All") {
          queryParams.push(`barangay=${selectedBrgy}`);
        }
        if (startDate && endDate) {
          queryParams.push(`startDate=${startDate}`);
          queryParams.push(`endDate=${endDate}`);
        }
        const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

        const response = await fetch(`${API_URL}/polulations-users${queryString}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Initialize data for all months of the selected year
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthlyData = Array(12).fill(0);
        
        // Fill in actual data
        data.forEach(user => {
          const date = new Date(user.accepted_at);
          const month = date.getMonth();
          monthlyData[month]++;
        });

        setMonthlyPopulation({
          labels: monthNames,
          datasets: [{
            label: 'Monthly Population',
            data: monthlyData,
            borderColor: '#4CAF50',
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            tension: 0.4,
            fill: true
          }]
        });
      } catch (error) {
        console.error('Error fetching monthly population:', error);
        setError('Failed to load monthly population data.');
        // Set empty data instead of mock data when there's an error
        setMonthlyPopulation({
          labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
          datasets: [{
            label: 'Monthly Population',
            data: Array(12).fill(0), // Set all months to 0 instead of mock data
            borderColor: '#4CAF50',
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            tension: 0.4,
            fill: true
          }]
        });
      }
    };

    fetchMonthlyPopulation();
  }, [selectedBrgy, startDate, endDate]);

  // Update useEffect for beneficiaries to use selectedBrgy
  useEffect(() => {
    const fetchBeneficiariesData = async () => {
      try {
        const response = await fetch(`${API_URL}/beneficiaries-users${
          selectedBrgy !== "All" ? `?barangay=${selectedBrgy}` : ''
        }`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setBeneficiariesData({
          beneficiaries: data.beneficiaries,
          nonBeneficiaries: data.nonBeneficiaries
        });
      } catch (error) {
        console.error('Error fetching beneficiaries data:', error);
        // Use mock data on error
        setBeneficiariesData({
          beneficiaries: 120,
          nonBeneficiaries: 80
        });
      }
    };

    fetchBeneficiariesData();
  }, [selectedBrgy]); // Add selectedBrgy as dependency
  
  // Add useEffect for children count data
  useEffect(() => {
    const fetchChildrenCountData = async () => {
      try {
        // Build the query string with filters
        let queryParams = [];
        if (selectedBrgy !== "All") {
          queryParams.push(`barangay=${selectedBrgy}`);
        }
        if (startDate && endDate) {
          queryParams.push(`startDate=${startDate}`);
          queryParams.push(`endDate=${endDate}`);
        }
        const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

        const response = await fetch(`${API_URL}/children-count-data-superadmin${queryString}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        setChildrenCountData({
          childrenCountDistribution: data.childrenCountDistribution || []
        });
      } catch (error) {
        console.error('Error fetching children count data:', error);
        // Use mock data on error
        setChildrenCountData({
          childrenCountDistribution: [
            { count: '0', frequency: 10 },
            { count: '1', frequency: 25 },
            { count: '2', frequency: 18 },
            { count: '3', frequency: 12 },
            { count: '4', frequency: 8 },
            { count: '5', frequency: 5 },
            { count: '6+', frequency: 3 }
          ]
        });
      }
    };

    fetchChildrenCountData();
  }, [selectedBrgy, startDate, endDate]);
  
  // Add useEffect for children age data
  useEffect(() => {
    const fetchChildrenAgeData = async () => {
      try {
        // Build the query string with filters
        let queryParams = [];
        if (selectedBrgy !== "All") {
          queryParams.push(`barangay=${selectedBrgy}`);
        }
        if (startDate && endDate) {
          queryParams.push(`startDate=${startDate}`);
          queryParams.push(`endDate=${endDate}`);
        }
        const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

        const response = await fetch(`${API_URL}/children-age-data${queryString}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        setChildrenAgeData({
          ageGroups: data.ageGroups || {
            '0-5': 0,
            '6-12': 0,
            '13-17': 0,
            '18-21': 0,
            '22+': 0
          },
          rawData: data.rawData || []
        });
      } catch (error) {
        console.error('Error fetching children age data:', error);
        // Use mock data on error
        setChildrenAgeData({
          ageGroups: {
            '0-5': 15,
            '6-12': 25,
            '13-17': 18,
            '18-21': 10,
            '22+': 5
          },
          rawData: [
            { age: 2, count: 5 },
            { age: 4, count: 10 },
            { age: 8, count: 12 },
            { age: 10, count: 13 },
            { age: 15, count: 8 },
            { age: 17, count: 10 },
            { age: 19, count: 6 },
            { age: 21, count: 4 },
            { age: 23, count: 3 },
            { age: 25, count: 2 }
          ]
        });
      }
    };

    fetchChildrenAgeData();
  }, [selectedBrgy, startDate, endDate]);
  
  // Add useEffect for age data analysis
  useEffect(() => {
    const fetchAgeData = async () => {
      try {
        // Build the query string with filters
        let queryParams = [];
        if (selectedBrgy !== "All") {
          queryParams.push(`barangay=${selectedBrgy}`);
        }
        if (startDate && endDate) {
          queryParams.push(`startDate=${startDate}`);
          queryParams.push(`endDate=${endDate}`);
        }
        const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

        const response = await fetch(`${API_URL}/users-age-data${queryString}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Process the age data
        if (data && data.length > 0) {
          // Calculate ages using the calculateAge function
          const ages = data.map(user => {
            if (!user.birthdate) return null;
            
            const birthDate = new Date(user.birthdate);
            const today = new Date();
            
            // Check if birthdate is valid
            if (isNaN(birthDate.getTime())) return null;
            
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            
            // If birthday hasn't occurred yet this year, subtract 1
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
              age--;
            }
            
            return age;
          }).filter(age => age !== null);
          
          // Sort ages for distribution
          const sortedAges = [...ages].sort((a, b) => a - b);
          
          // Get highest and lowest ages
          const highestAge = sortedAges.length > 0 ? sortedAges[sortedAges.length - 1] : 0;
          const lowestAge = sortedAges.length > 0 ? sortedAges[0] : 0;
          
          // Create age distribution data with frequency counting
          const ageFrequency = {};
          sortedAges.forEach(age => {
            const ageStr = age.toString();
            if (ageFrequency[ageStr]) {
              ageFrequency[ageStr]++;
            } else {
              ageFrequency[ageStr] = 1;
            }
          });
          
          // Convert to array and take top 10 most frequent ages
          const ageDistribution = Object.entries(ageFrequency)
            .map(([age, count]) => ({ age, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
          
          setAgeData({
            highestAge,
            lowestAge,
            ageDistribution
          });
        } else {
          // Set default values if no data
          setAgeData({
            highestAge: 0,
            lowestAge: 0,
            ageDistribution: []
          });
        }
      } catch (error) {
        console.error('Error fetching age data:', error);
        // Use mock data on error
        const mockAgeData = [
          { age: '0', count: 8 },
          { age: '1', count: 5 },
          { age: '2', count: 7 },
          { age: '3', count: 6 },
          { age: '4', count: 9 },
          { age: '5', count: 12 },
          { age: '6', count: 10 },
          { age: '7', count: 8 },
          { age: '8', count: 7 },
          { age: '9', count: 5 }
        ];
        
        setAgeData({
          highestAge: 65,
          lowestAge: 0,
          ageDistribution: mockAgeData
        });
      }
    };

    fetchAgeData();
  }, [selectedBrgy, startDate, endDate]);

  // Add new useEffect for application status
  useEffect(() => {
    const fetchApplicationStatus = async () => {
      try {
        // Build the query string with filters
        let queryParams = [];
        if (selectedBrgy !== "All") {
          queryParams.push(`barangay=${selectedBrgy}`);
        }
        if (startDate && endDate) {
          queryParams.push(`startDate=${startDate}`);
          queryParams.push(`endDate=${endDate}`);
        }
        const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

        const response = await fetch(`${API_URL}/application-status${queryString}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        setApplicationStatusData({
          declined: data.declined || 0,
          pending: data.pending || 0,
          accepted: data.accepted || 0  // This will include both Created and Verified
        });
      } catch (error) {
        console.error('Error fetching application status:', error);
        setApplicationStatusData({
          declined: 0,
          pending: 0,
          accepted: 0
        });
      }
    };

    fetchApplicationStatus();
  }, [selectedBrgy, startDate, endDate]);

  useEffect(() => {
    let resizeTimeout;
    
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        setWindowWidth(window.innerWidth);
        chartsRef.current.forEach(chart => {
          if (chart) {
            chart.getEchartsInstance().resize();
          }
        });
      }, 250);
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, []);

  const getFontSize = (baseSize) => {
    if (windowWidth < 480) return baseSize - 2;
    if (windowWidth < 768) return baseSize - 1;
    return baseSize;
  };

  const commonConfig = {
    grid: {
      top: 60,
      left: '8%',
      right: '5%',
      bottom: '12%',
      containLabel: true
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { 
        type: 'shadow',
        shadowStyle: {
          color: 'rgba(0,0,0,0.05)'
        }
      },
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#eee',
      borderWidth: 1,
      textStyle: {
        color: '#333'
      },
      padding: [10, 15]
    }
  };

  const populationOption = {
    title: {
      text: 'Monthly Population Trend',
      left: 'center',
      top: 20,
      textStyle: { 
        fontSize: getFontSize(16),
        fontWeight: 500,
        color: '#333'
      }
    },
    ...commonConfig,
    xAxis: {
      type: 'category',
      data: monthlyPopulation.labels || [],
      axisLabel: { 
        fontSize: getFontSize(11),
        color: '#666'
      },
      axisLine: {
        lineStyle: { color: '#eee' }
      }
    },
    yAxis: {
      type: 'value',
      axisLabel: { 
        fontSize: getFontSize(11),
        color: '#666'
      },
      splitLine: {
        lineStyle: { 
          color: '#f5f5f5',
          type: 'dashed'
        }
      }
    },
    series: [{
      name: 'Population',
      type: 'line',
      smooth: false,
      symbolSize: 8,
      data: monthlyPopulation.datasets?.[0]?.data || [],
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{
            offset: 0,
            color: 'rgba(22, 196, 127, 0.35)'
          }, {
            offset: 1,
            color: 'rgba(22, 196, 127, 0.05)'
          }]
        }
      },
      itemStyle: { 
        color: '#16C47F',
        borderWidth: 2,
        borderColor: '#fff'
      },
      emphasis: {
        itemStyle: {
          borderWidth: 3,
          shadowBlur: 10,
          shadowColor: 'rgba(22, 196, 127, 0.3)'
        }
      }
    }]
  };

  const ageDistributionOption = {
    title: {
      text: 'Application Status',
      left: 'center',
      top: 20,
      textStyle: { 
        fontSize: getFontSize(16),
        fontWeight: 500,
        color: '#333'
      }
    },
    tooltip: {
      trigger: 'axis',
      formatter: function(params) {
        const param = params[0];
        let statusText = param.name;
        if (param.name === 'Accepted') {
          statusText = 'Accepted (Verified and Created)';
        }
        return `${statusText}: ${param.value}`;
      }
    },
    ...commonConfig,
    xAxis: {
      type: 'category',
      data: ['Declined', 'Pending', 'Accepted'],
      axisLabel: { 
        fontSize: getFontSize(11),
        color: '#666',
        interval: 0,  // Force show all labels
        rotate: 0     // No rotation
      },
      axisTick: {
        alignWithLabel: true
      },
      axisLine: {
        lineStyle: { color: '#eee' }
      }
    },
    yAxis: {
      type: 'value',
      axisLabel: { 
        fontSize: getFontSize(11),
        color: '#666'
      },
      splitLine: {
        lineStyle: { 
          color: '#f5f5f5',
          type: 'dashed'
        }
      }
    },
    series: [{
      type: 'bar',
      barWidth: '50%',  // Adjust bar width
      data: [
        applicationStatusData.declined,
        applicationStatusData.pending,
        applicationStatusData.accepted
      ],
      itemStyle: {
        color: function(params) {
          // Different colors for each status
          const colors = {
            0: '#FF6B6B',  // Red for Declined
            1: '#FFB236',  // Orange for Pending
            2: '#16C47F'   // Green for Accepted
          };
          return colors[params.dataIndex];
        },
        borderRadius: [4, 4, 0, 0]
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowColor: 'rgba(0,0,0,0.3)'
        }
      },
      label: {
        show: true,
        position: 'top',
        fontSize: getFontSize(11),
        color: '#666'
      }
    }]
  };

  const employmentOption = {
    title: {
      text: 'Beneficiary Status',
      left: 'center',
      top: 20,
      textStyle: { 
        fontSize: getFontSize(16),
        fontWeight: 500,
        color: '#333'
      }
    },
    ...commonConfig,
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)'
    },
    series: [{
      name: 'Beneficiary Status',
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 4,
        borderColor: '#fff',
        borderWidth: 2
      },
      label: {
        show: false,
        position: 'center'
      },
      emphasis: {
        label: {
          show: true,
          fontSize: getFontSize(14),
          fontWeight: 'bold'
        }
      },
      labelLine: {
        show: false
      },
      data: [
        { 
          value: beneficiariesData.beneficiaries, 
          name: 'Beneficiaries',
          itemStyle: { color: '#16C47F' }
        },
        { 
          value: beneficiariesData.nonBeneficiaries, 
          name: 'Non-Beneficiaries',
          itemStyle: { color: '#FF6B6B' }
        }
      ]
    }]
  };
  
  // Add children age distribution chart option
  const childrenAgeOption = {
    title: {
      text: 'Children Age Distribution',
      left: 'center',
      top: 20,
      textStyle: { 
        fontSize: getFontSize(16),
        fontWeight: 500,
        color: '#333'
      }
    },
    ...commonConfig,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: function(params) {
        return `${params[0].name}: ${params[0].value} children`;
      }
    },
    xAxis: {
      type: 'category',
      data: Object.keys(childrenAgeData.ageGroups),
      axisLabel: { 
        fontSize: getFontSize(11),
        color: '#666',
        interval: 0
      },
      axisTick: {
        alignWithLabel: true
      },
      axisLine: {
        lineStyle: { color: '#eee' }
      }
    },
    yAxis: {
      type: 'value',
      name: 'Number of Children',
      nameTextStyle: {
        fontSize: getFontSize(11),
        color: '#666',
        padding: [0, 0, 10, 0]
      },
      axisLabel: { 
        fontSize: getFontSize(11),
        color: '#666'
      },
      splitLine: {
        lineStyle: { 
          color: '#f5f5f5',
          type: 'dashed'
        }
      }
    },
    series: [{
      name: 'Children Age',
      type: 'bar',
      barWidth: '60%',
      data: Object.values(childrenAgeData.ageGroups),
      itemStyle: {
        color: function(params) {
          // Different colors for each age group
          const colors = ['#4ECDC4', '#FF6B6B', '#FFD166', '#118AB2', '#073B4C'];
          return colors[params.dataIndex % colors.length];
        },
        borderRadius: [4, 4, 0, 0]
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowColor: 'rgba(0,0,0,0.3)'
        }
      },
      label: {
        show: true,
        position: 'top',
        fontSize: getFontSize(11),
        color: '#666'
      }
    }]
  };

  const getChildrenCountChartOptions = () => {
    // Use real children count data from state
    const childrenDistribution = childrenCountData.childrenCountDistribution.length > 0 ? 
      childrenCountData.childrenCountDistribution : 
      [{ count: '0', frequency: 0 }]; // Fallback if no data
    
    return {
      title: {
        text: 'Bilang ng Anak ng mga Solo Parent',
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold'
        }
      },
      tooltip: {
        trigger: 'axis',
        formatter: '{b}: {c} solo parents',
        axisPointer: {
          type: 'shadow'
        }
      },
      xAxis: {
        type: 'category',
        data: childrenDistribution.map(item => item.count),
        axisLabel: {
          fontSize: getFontSize(11),
          color: '#666'
        },
        axisTick: {
          alignWithLabel: true
        }
      },
      yAxis: {
        type: 'value',
        name: 'Bilang ng Solo Parents',
        nameLocation: 'middle',
        nameGap: 30,
        axisLabel: {
          fontSize: getFontSize(11),
          color: '#666'
        },
        splitLine: {
          lineStyle: {
            color: '#f5f5f5',
            type: 'dashed'
          }
        }
      },
      series: [{
        name: 'Solo Parents',
        type: 'bar',
        barWidth: '60%',
        data: childrenDistribution.map(item => item.frequency),
        itemStyle: {
          color: function(params) {
            // Different colors for different bars
            const colors = ['#FF6B6B', '#FFB236', '#16C47F', '#4D96FF', '#9C27B0', '#607D8B', '#795548'];
            return colors[params.dataIndex % colors.length];
          },
          borderRadius: [4, 4, 0, 0]
        },
        label: {
          show: true,
          position: 'top',
          fontSize: getFontSize(11),
          color: '#666'
        }
      }]
    };
  };
  
  const getAgeChartOptions = () => {
    // Use real age data from state instead of mock data
    const ageDistribution = ageData.ageDistribution.length > 0 ? 
      ageData.ageDistribution : 
      [{ age: '0', count: 0 }]; // Fallback if no data
    
    return {
      title: {
        text: `Age (Lowest: ${ageData.lowestAge} - Highest: ${ageData.highestAge})`,
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold'
        }
      },
      tooltip: {
        trigger: 'axis',
        formatter: function(params) {
          return `Age ${params[0].name}`;
        }
      },
      xAxis: {
        type: 'category',
        data: ageDistribution.map(item => item.age),
        axisLabel: {
          interval: 0
        }
      },
      yAxis: {
        type: 'value',
        show: false
      },
      series: [
        {
          type: 'bar',
          data: ageDistribution.map(item => item.count), // Use actual count for bar height
          label: {
            show: true,
            position: 'top',
            formatter: function(params) {
              return `${ageDistribution[params.dataIndex].age} (${params.value})`;
            }
          },
          itemStyle: {
            color: '#91CC75'
          }
        }
      ]
    };
  };

  
  // Update generateExcelReport to include beneficiary data
  const generateExcelReport = async () => {
    if (reportCount >= 5) {
      setReportLimitMessage('You have reached the maximum of 5 report generations.');
      return;
    }

    if (!startDate || !endDate) {
      setDateError('Please select both start and end dates for the report');
      return;
    }

    if (!validateDates(startDate, endDate)) {
      return;
    }

    try {
      // Fetch population data with date range
      const populationResponse = await fetch(
        `${API_URL}/polulations-users?${
          selectedBrgy !== "All" ? `barangay=${selectedBrgy}&` : ''
        }startDate=${startDate}&endDate=${endDate}`
      );
      
      if (!populationResponse.ok) {
        throw new Error('Failed to fetch population data');
      }

      const populationData = await populationResponse.json();

      // Fetch beneficiaries data with date range
      const beneficiariesResponse = await fetch(
        `${API_URL}/beneficiaries-users?${
          selectedBrgy !== "All" ? `barangay=${selectedBrgy}&` : ''
        }startDate=${startDate}&endDate=${endDate}`
      );

      if (!beneficiariesResponse.ok) {
        throw new Error('Failed to fetch beneficiaries data');
      }

      const beneficiariesData = await beneficiariesResponse.json();

      // Fetch application status data
      const applicationStatusResponse = await fetch(
        `${API_URL}/application-status?${
          selectedBrgy !== "All" ? `barangay=${selectedBrgy}&` : ''
        }startDate=${startDate}&endDate=${endDate}`
      );

      if (!applicationStatusResponse.ok) {
        throw new Error('Failed to fetch application status data');
      }

      const applicationStatusData = await applicationStatusResponse.json();

      // Count users by status
      const statusCounts = populationData.reduce((acc, user) => {
        acc[user.status] = (acc[user.status] || 0) + 1;
        return acc;
      }, {});

      // Create workbook
      const wb = XLSX.utils.book_new();

      // Helper function to create the main report titles (always at the very top)
      const createMainReportTitles = () => {
        return [
          { A: 'SANTA MARIA MUNICIPALITY' },
          { A: 'Municipal Social Welfare and Development Office (MSWDO)' },
          { A: 'SOLO PARENT ANALYTICS REPORT' } 
        ];
      };

      // Helper function to create sheet-specific header details
      const createSheetHeaderDetails = (title, subtitle = '') => {
        return [
          { A: `Report Period: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}` },
          { A: `Barangay: ${selectedBrgy}` },
          { A: `Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}` },
          { A: '' }, // Empty row for spacing
          { A: title },
          { A: subtitle }
        ];
      };

      // Helper function to add general report header styling and column widths
      const addReportHeaderStyling = (ws) => {
        // Define column widths for general header area
        ws['!cols'] = [
          { wch: 35 }, // Column A for main text
          { wch: 20 }, // Column B
          { wch: 20 }, // Column C
          { wch: 20 }, // Column D
          { wch: 20 }, // Column E
          { wch: 20 }, // Column F
          { wch: 20 }, // Column G
          { wch: 20 }  // Column H
        ];

        // Merge cells for main titles (first 3 rows)
        ws['!merges'] = ws['!merges'] || [];
        ws['!merges'].push(
          { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }, // Row 1
          { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } }, // Row 2
          { s: { r: 2, c: 0 }, e: { r: 2, c: 7 } }  // Row 3
        );

        // Style the main report header rows (Rows 1-3)
        for (let i = 0; i < 3; i++) { // From row 1 to 3 (0-indexed)
          const cellRef = `A${i + 1}`;
          if (ws[cellRef]) {
            ws[cellRef].s = {
              font: {
                bold: true,
                sz: (i === 2) ? 20 : 14, // Corrected 'size' to 'sz'
                color: { rgb: "FFFFFF" }
              },
              fill: { fgColor: { rgb: "16C47F" } }, // Green background
              alignment: { horizontal: "center", vertical: "center" }
            };
          }
        }

        // Merge cells for report period, barangay, generated on, sheet title, subtitle
        // These start after the 3 main titles + 1 empty row = row 5 (index 4)
        // There are 6 rows for these details
        for (let i = 4; i < 10; i++) { // From row 5 to 10 (0-indexed)
             ws['!merges'].push({ s: { r: i, c: 0 }, e: { r: i, c: 7 } });
             const cellRef = `A${i + 1}`;
             if (ws[cellRef]) {
                 ws[cellRef].s = {
                     font: { bold: (i === 8 || i === 9), sz: (i === 8 || i === 9) ? 16 : 12, color: { rgb: "000000" } }, // Corrected 'size' to 'sz'
                     fill: { fgColor: { rgb: "F0F0F0" } }, // Light grey background
                     alignment: { horizontal: "center", vertical: "center" }
                 };
             }
        }
      };

      // Helper function to add data table header styling
      const addDataTableHeaderStyling = (ws, headerRowIndex, numColumns) => {
        for (let c = 0; c < numColumns; c++) {
          const cellRef = XLSX.utils.encode_cell({ r: headerRowIndex - 1, c: c }); // headerRowIndex is 1-based
          if (ws[cellRef]) {
            ws[cellRef].s = {
              font: { bold: true, sz: 12, color: { rgb: "000000" } }, // Corrected 'size' to 'sz'
              fill: { fgColor: { rgb: "D9EAD3" } }, // Light green background
              alignment: { horizontal: "center", vertical: "center" },
              border: {
                top: { style: "thin", color: { rgb: "000000" } },
                bottom: { style: "thin", color: { rgb: "000000" } },
                left: { style: "thin", color: { rgb: "000000" } },
                right: { style: "thin", color: { rgb: "000000" } }
              }
            };
          }
        }
      };

      // Helper function to add alternating row colors for data
      const addAlternatingRowColors = (ws, startRowIndex, endRowIndex, numColumns) => {
        const color1 = "FFFFFF"; // White
        const color2 = "F2F2F2"; // Light Grey

        for (let r = startRowIndex - 1; r < endRowIndex; r++) { // 0-indexed
          const rowColor = (r % 2 === 0) ? color1 : color2; // Alternating color
          for (let c = 0; c < numColumns; c++) {
            const cellRef = XLSX.utils.encode_cell({ r: r, c: c });
            // Ensure the cell exists before trying to modify its style
            if (ws[cellRef]) {
              ws[cellRef].s = ws[cellRef].s || {}; // Ensure style object exists
              ws[cellRef].s.fill = { fgColor: { rgb: rowColor } };
            } else {
              // If cell doesn't exist, create it and apply style
              ws[cellRef] = { s: { fill: { fgColor: { rgb: rowColor } } } };
            }
          }
        }
      };

      // Sheet 1: Executive Summary
      const summaryData = [
        ...createMainReportTitles(),
        { A: '' }, // Empty row for spacing between main titles and sheet details
        ...createSheetHeaderDetails('EXECUTIVE SUMMARY', 'Comprehensive Overview of Solo Parent Data'),
        { A: '', B: '', C: '', D: '', E: '', F: '', G: '', H: '' }, // Empty row for clear separation
        { A: 'METRIC', B: 'VALUE', C: 'PERCENTAGE', D: 'NOTES' },
        { A: 'Total Population', B: populationData.length, C: '100%', D: 'All registered solo parents' },
        { A: 'Verified Users', B: statusCounts['Verified'] || 0, C: `${((statusCounts['Verified'] || 0) / populationData.length * 100).toFixed(1)}%`, D: 'Fully verified applications' },
        { A: 'Pending Remarks', B: statusCounts['Pending Remarks'] || 0, C: `${((statusCounts['Pending Remarks'] || 0) / populationData.length * 100).toFixed(1)}%`, D: 'Awaiting additional documents' },
        { A: 'Terminated Users', B: statusCounts['Terminated'] || 0, C: `${((statusCounts['Terminated'] || 0) / populationData.length * 100).toFixed(1)}%`, D: 'Disqualified applications' },
        { A: '', B: '', C: '', D: '', E: '', F: '', G: '', H: '' }, // Empty row for clear separation
        { A: 'BENEFICIARY STATUS', B: '', C: '', D: '' },
        { A: 'Beneficiaries', B: beneficiariesData.beneficiaries, C: `${(beneficiariesData.beneficiaries / (beneficiariesData.beneficiaries + beneficiariesData.nonBeneficiaries) * 100).toFixed(1)}%`, D: 'Receiving benefits' },
        { A: 'Non-Beneficiaries', B: beneficiariesData.nonBeneficiaries, C: `${(beneficiariesData.nonBeneficiaries / (beneficiariesData.beneficiaries + beneficiariesData.nonBeneficiaries) * 100).toFixed(1)}%`, D: 'Not receiving benefits' },
        { A: '', B: '', C: '', D: '', E: '', F: '', G: '', H: '' }, // Empty row for clear separation
        { A: 'APPLICATION STATUS', B: '', C: '', D: '' },
        { A: 'Accepted', B: applicationStatusData.accepted || 0, C: `${((applicationStatusData.accepted || 0) / ((applicationStatusData.accepted || 0) + (applicationStatusData.pending || 0) + (applicationStatusData.declined || 0)) * 100).toFixed(1)}%`, D: 'Approved applications' },
        { A: 'Pending', B: applicationStatusData.pending || 0, C: `${((applicationStatusData.pending || 0) / ((applicationStatusData.accepted || 0) + (applicationStatusData.pending || 0) + (applicationStatusData.declined || 0)) * 100).toFixed(1)}%`, D: 'Under review' },
        { A: 'Declined', B: applicationStatusData.declined || 0, C: `${((applicationStatusData.declined || 0) / ((applicationStatusData.accepted || 0) + (applicationStatusData.pending || 0) + (applicationStatusData.declined || 0)) * 100).toFixed(1)}%`, D: 'Rejected applications' }
      ];

      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      addReportHeaderStyling(summarySheet);
      addDataTableHeaderStyling(summarySheet, 12, 4);
      addAlternatingRowColors(summarySheet, 13, 16, 4);
      addDataTableHeaderStyling(summarySheet, 18, 4);
      addAlternatingRowColors(summarySheet, 19, 20, 4);
      addDataTableHeaderStyling(summarySheet, 22, 4);
      addAlternatingRowColors(summarySheet, 23, 25, 4);
      XLSX.utils.book_append_sheet(wb, summarySheet, "Executive Summary");

      // Sheet 2: Monthly Population Analysis
      const monthlyPopulationData = [
        ...createMainReportTitles(),
        { A: '' }, // Empty row for spacing between main titles and sheet details
        ...createSheetHeaderDetails('MONTHLY POPULATION ANALYSIS', 'Population Trends by Month'),
        { A: '', B: '', C: '', D: '', E: '', F: '', G: '', H: '' }, // Empty row for clear separation
        { A: 'MONTH', B: 'POPULATION COUNT', C: 'CUMULATIVE TOTAL', D: 'MONTHLY GROWTH %' },
        ...monthlyPopulation.labels.map((month, index) => {
          const cumulative = monthlyPopulation.datasets[0].data.slice(0, index + 1).reduce((sum, count) => sum + count, 0);
          const growth = index > 0 ? ((monthlyPopulation.datasets[0].data[index] - monthlyPopulation.datasets[0].data[index - 1]) / monthlyPopulation.datasets[0].data[index - 1] * 100).toFixed(1) : '0.0';
          return {
            A: month,
            B: monthlyPopulation.datasets[0].data[index],
            C: cumulative,
            D: `${growth}%`
          };
        }),
        { A: '', B: '', C: '', D: '', E: '', F: '', G: '', H: '' }, // Empty row for clear separation
        { A: 'TOTAL', B: monthlyPopulation.datasets[0].data.reduce((sum, count) => sum + count, 0), C: '', D: '' }
      ];

      const monthlyPopulationSheet = XLSX.utils.json_to_sheet(monthlyPopulationData);
      addReportHeaderStyling(monthlyPopulationSheet);
      addDataTableHeaderStyling(monthlyPopulationSheet, 12, 4);
      addAlternatingRowColors(monthlyPopulationSheet, 13, 13 + monthlyPopulation.labels.length - 1, 4);
      XLSX.utils.book_append_sheet(wb, monthlyPopulationSheet, "Monthly Population");

      // Sheet 3: Beneficiaries Analysis
      const beneficiariesAnalysisData = [
        ...createMainReportTitles(),
        { A: '' }, // Empty row for spacing between main titles and sheet details
        ...createSheetHeaderDetails('BENEFICIARIES ANALYSIS', 'Detailed Breakdown of Beneficiary Status'),
        { A: '', B: '', C: '', D: '', E: '', F: '', G: '', H: '' }, // Empty row for clear separation
        { A: 'CATEGORY', B: 'COUNT', C: 'PERCENTAGE', D: 'DESCRIPTION' },
        { A: 'Beneficiaries', B: beneficiariesData.beneficiaries, C: `${(beneficiariesData.beneficiaries / (beneficiariesData.beneficiaries + beneficiariesData.nonBeneficiaries) * 100).toFixed(1)}%`, D: 'Solo parents currently receiving government benefits' },
        { A: 'Non-Beneficiaries', B: beneficiariesData.nonBeneficiaries, C: `${(beneficiariesData.nonBeneficiaries / (beneficiariesData.beneficiaries + beneficiariesData.nonBeneficiaries) * 100).toFixed(1)}%`, D: 'Solo parents not receiving benefits' },
        { A: '', B: '', C: '', D: '', E: '', F: '', G: '', H: '' }, // Empty row for clear separation
        { A: 'TOTAL', B: beneficiariesData.beneficiaries + beneficiariesData.nonBeneficiaries, C: '100%', D: 'Total registered solo parents' },
        { A: '', B: '', C: '', D: '', E: '', F: '', G: '', H: '' }, // Empty row for clear separation
        { A: 'ANALYSIS NOTES:', B: '', C: '', D: '' },
        { A: '• Beneficiary Rate', B: `${(beneficiariesData.beneficiaries / (beneficiariesData.beneficiaries + beneficiariesData.nonBeneficiaries) * 100).toFixed(1)}%`, C: '', D: 'Percentage of solo parents receiving benefits' },
        { A: '• Coverage Gap', B: `${(beneficiariesData.nonBeneficiaries / (beneficiariesData.beneficiaries + beneficiariesData.nonBeneficiaries) * 100).toFixed(1)}%`, C: '', D: 'Percentage not yet receiving benefits' }
      ];

      const beneficiariesSheet = XLSX.utils.json_to_sheet(beneficiariesAnalysisData);
      addReportHeaderStyling(beneficiariesSheet);
      addDataTableHeaderStyling(beneficiariesSheet, 12, 4);
      addAlternatingRowColors(beneficiariesSheet, 13, 14, 4);
      addDataTableHeaderStyling(beneficiariesSheet, 17, 4);
      addAlternatingRowColors(beneficiariesSheet, 18, 18, 4);
      addDataTableHeaderStyling(beneficiariesSheet, 20, 4);
      addAlternatingRowColors(beneficiariesSheet, 21, 22, 4);
      XLSX.utils.book_append_sheet(wb, beneficiariesSheet, "Beneficiaries Analysis");

      // Sheet 4: Application Status Analysis
      const totalApplications = (applicationStatusData.accepted || 0) + (applicationStatusData.pending || 0) + (applicationStatusData.declined || 0);
      const applicationAnalysisData = [
        ...createMainReportTitles(),
        { A: '' }, // Empty row for spacing between main titles and sheet details
        ...createSheetHeaderDetails('APPLICATION STATUS ANALYSIS', 'Comprehensive Application Processing Overview'),
        { A: '', B: '', C: '', D: '', E: '' }, // Empty row for clear separation
        { A: 'STATUS', B: 'COUNT', C: 'PERCENTAGE', D: 'PROCESSING TIME', E: 'NOTES' },
        { A: 'Accepted', B: applicationStatusData.accepted || 0, C: `${((applicationStatusData.accepted || 0) / totalApplications * 100).toFixed(1)}%`, D: '15-30 days', E: 'Successfully processed applications' },
        { A: 'Pending', B: applicationStatusData.pending || 0, C: `${((applicationStatusData.pending || 0) / totalApplications * 100).toFixed(1)}%`, D: 'Under review', E: 'Applications awaiting review or additional documents' },
        { A: 'Declined', B: applicationStatusData.declined || 0, C: `${((applicationStatusData.declined || 0) / totalApplications * 100).toFixed(1)}%`, D: 'N/A', E: 'Applications that did not meet requirements' },
        { A: '', B: '', C: '', D: '', E: '', F: '', G: '', H: '' }, // Empty row for clear separation
        { A: 'TOTAL APPLICATIONS', B: totalApplications, C: '100%', D: '', E: '' },
        { A: '', B: '', C: '', D: '', E: '', F: '', G: '', H: '' }, // Empty row for clear separation
        { A: 'PERFORMANCE METRICS:', B: '', C: '', D: '', E: '' },
        { A: '• Acceptance Rate', B: `${((applicationStatusData.accepted || 0) / totalApplications * 100).toFixed(1)}%`, C: '', D: '', E: 'Percentage of successful applications' },
        { A: '• Processing Efficiency', B: `${((applicationStatusData.accepted || 0) / (applicationStatusData.accepted || 0 + applicationStatusData.pending || 0) * 100).toFixed(1)}%`, C: '', D: '', E: 'Efficiency of application processing' }
      ];

      const applicationStatusSheet = XLSX.utils.json_to_sheet(applicationAnalysisData);
      addReportHeaderStyling(applicationStatusSheet);
      addDataTableHeaderStyling(applicationStatusSheet, 12, 5);
      addAlternatingRowColors(applicationStatusSheet, 13, 15, 5);
      addDataTableHeaderStyling(applicationStatusSheet, 17, 5);
      addAlternatingRowColors(applicationStatusSheet, 18, 18, 5);
      addDataTableHeaderStyling(applicationStatusSheet, 20, 5);
      addAlternatingRowColors(applicationStatusSheet, 21, 22, 5);
      XLSX.utils.book_append_sheet(wb, applicationStatusSheet, "Application Status");

      // Sheet 5: Demographics Analysis
      const demographicsData = [
        ...createMainReportTitles(),
        { A: '' }, // Empty row for spacing between main titles and sheet details
        ...createSheetHeaderDetails('DEMOGRAPHICS ANALYSIS', 'Age Distribution and Statistics'),
        { A: '', B: '', C: '', D: '', E: '', F: '', G: '', H: '' }, // Empty row for clear separation
        { A: 'AGE STATISTICS', B: 'VALUE', C: 'RANGE', D: 'ANALYSIS' },
        { A: 'Lowest Age', B: ageData.lowestAge, C: 'Minimum', D: 'Youngest solo parent in the system' },
        { A: 'Highest Age', B: ageData.highestAge, C: 'Maximum', D: 'Oldest solo parent in the system' },
        { A: 'Age Range', B: ageData.highestAge - ageData.lowestAge, C: 'Span', D: 'Total age range covered' },
        { A: '', B: '', C: '', D: '', E: '', F: '', G: '', H: '' }, // Empty row for clear separation
        { A: 'TOP 10 AGE GROUPS', B: 'COUNT', C: 'PERCENTAGE', D: 'AGE RANGE' },
        ...ageData.ageDistribution.slice(0, 10).map(item => ({
          A: `Age ${item.age}`,
          B: item.count,
          C: `${(item.count / ageData.ageDistribution.reduce((sum, age) => sum + age.count, 0) * 100).toFixed(1)}%`,
          D: `${item.age} years old`
        })),
        { A: '', B: '', C: '', D: '', E: '', F: '', G: '', H: '' }, // Empty row for clear separation
        { A: 'DEMOGRAPHIC INSIGHTS:', B: '', C: '', D: '' },
        { A: '• Most Common Age', B: ageData.ageDistribution[0]?.age || 'N/A', C: '', D: 'Age group with highest representation' },
        { A: '• Age Diversity', B: ageData.ageDistribution.length, C: '', D: 'Number of different age groups represented' }
      ];

      const demographicsSheet = XLSX.utils.json_to_sheet(demographicsData);
      addReportHeaderStyling(demographicsSheet);
      addDataTableHeaderStyling(demographicsSheet, 12, 4);
      addAlternatingRowColors(demographicsSheet, 13, 15, 4);
      addDataTableHeaderStyling(demographicsSheet, 17, 4);
      addAlternatingRowColors(demographicsSheet, 18, 18 + ageData.ageDistribution.slice(0, 10).length - 1, 4);
      addDataTableHeaderStyling(demographicsSheet, 18 + ageData.ageDistribution.slice(0, 10).length + 2, 4);
      addAlternatingRowColors(demographicsSheet, 18 + ageData.ageDistribution.slice(0, 10).length + 3, 18 + ageData.ageDistribution.slice(0, 10).length + 4, 4);
      XLSX.utils.book_append_sheet(wb, demographicsSheet, "Demographics");

      // Sheet 6: Children Analysis
      const childrenAnalysisData = [
        ...createMainReportTitles(),
        { A: '' }, // Empty row for spacing between main titles and sheet details
        ...createSheetHeaderDetails('CHILDREN ANALYSIS', 'Comprehensive Children Count and Age Distribution'),
        { A: '', B: '', C: '', D: '', E: '', F: '', G: '', H: '' }, // Empty row for clear separation
        { A: 'CHILDREN COUNT DISTRIBUTION', B: 'NUMBER OF SOLO PARENENTS', C: 'PERCENTAGE', D: 'ANALYSIS' },
        ...childrenCountData.childrenCountDistribution.map(item => ({
          A: `${item.count} children`,
          B: item.frequency,
          C: `${(item.frequency / childrenCountData.childrenCountDistribution.reduce((sum, child) => sum + child.frequency, 0) * 100).toFixed(1)}%`,
          D: `Solo parents with ${item.count} children`
        })),
        { A: '', B: '', C: '', D: '', E: '', F: '', G: '', H: '' }, // Empty row for clear separation
        { A: 'CHILDREN AGE DISTRIBUTION', B: '', C: '', D: '' },
        { A: 'Age Group', B: 'Count', C: 'Percentage', D: 'Description' },
        { A: '0-5 years', B: childrenAgeData.ageGroups['0-5'], C: `${(childrenAgeData.ageGroups['0-5'] / Object.values(childrenAgeData.ageGroups).reduce((sum, count) => sum + count, 0) * 100).toFixed(1)}%`, D: 'Preschool age children' },
        { A: '6-12 years', B: childrenAgeData.ageGroups['6-12'], C: `${(childrenAgeData.ageGroups['6-12'] / Object.values(childrenAgeData.ageGroups).reduce((sum, count) => sum + count, 0) * 100).toFixed(1)}%`, D: 'Elementary school age children' },
        { A: '13-17 years', B: childrenAgeData.ageGroups['13-17'], C: `${(childrenAgeData.ageGroups['13-17'] / Object.values(childrenAgeData.ageGroups).reduce((sum, count) => sum + count, 0) * 100).toFixed(1)}%`, D: 'High school age children' },
        { A: '18-21 years', B: childrenAgeData.ageGroups['18-21'], C: `${(childrenAgeData.ageGroups['18-21'] / Object.values(childrenAgeData.ageGroups).reduce((sum, count) => sum + count, 0) * 100).toFixed(1)}%`, D: 'Young adult children' },
        { A: '22+ years', B: childrenAgeData.ageGroups['22+'], C: `${(childrenAgeData.ageGroups['22+'] / Object.values(childrenAgeData.ageGroups).reduce((sum, count) => sum + count, 0) * 100).toFixed(1)}%`, D: 'Adult children' }
      ];

      const childrenSheet = XLSX.utils.json_to_sheet(childrenAnalysisData);
      addReportHeaderStyling(childrenSheet);
      addDataTableHeaderStyling(childrenSheet, 12, 4);
      addAlternatingRowColors(childrenSheet, 13, 13 + childrenCountData.childrenCountDistribution.length - 1, 4);
      addDataTableHeaderStyling(childrenSheet, 13 + childrenCountData.childrenCountDistribution.length + 2, 4);
      addAlternatingRowColors(childrenSheet, 13 + childrenCountData.childrenCountDistribution.length + 3, 13 + childrenCountData.childrenCountDistribution.length + 7, 4);
      XLSX.utils.book_append_sheet(wb, childrenSheet, "Children Analysis");

      // Sheet 7: Detailed User List
      // Fetch detailed user list specifically for this sheet (with names and filters)
      const detailedUserListResponse = await fetch(
        `${API_URL}/accepted-users?${
          selectedBrgy !== "All" ? `barangay=${selectedBrgy}&` : ''
        }startDate=${startDate}&endDate=${endDate}`
      );

      if (!detailedUserListResponse.ok) {
        throw new Error('Failed to fetch detailed user list data.');
      }
      const detailedUserListData = await detailedUserListResponse.json();

      const userListData = [
        ...createMainReportTitles(),
        { A: '' }, // Empty row for spacing between main titles and sheet details
        ...createSheetHeaderDetails('DETAILED USER LIST', 'Complete List of Registered Solo Parents'),
        { A: '', B: '', C: '', D: '' }, // Empty row for clear separation
        { A: 'NO.', B: 'NAME', C: 'BARANGAY', D: 'ACCEPTED DATE' },
        ...detailedUserListData.map((user, index) => ({
          A: index + 1,
          B: user.name || 'N/A', // Ensure name is used here
          C: user.barangay || selectedBrgy,
          D: new Date(user.accepted_at).toLocaleDateString()
        }))
      ];

      const userListSheet = XLSX.utils.json_to_sheet(userListData);
      addReportHeaderStyling(userListSheet);
      addDataTableHeaderStyling(userListSheet, 12, 4);
      addAlternatingRowColors(userListSheet, 13, 13 + detailedUserListData.length - 1, 4);
      XLSX.utils.book_append_sheet(wb, userListSheet, "User List");

      // Save the workbook with professional filename
      const reportDate = new Date().toISOString().split('T')[0];
      const fileName = `MSWDO_Solo_Parent_Report_${selectedBrgy}_${startDate}_to_${endDate}_${reportDate}.xlsx`;
      XLSX.writeFile(wb, fileName);

      // Show success message
      setSuccessMessage('Generated Success');
      setShowSuccessModal(true);
      setTimeout(() => setShowSuccessModal(false), 2000);
      // Increment report count
      const newCount = reportCount + 1;
      setReportCount(newCount);
      localStorage.setItem('superadmin_report_count', newCount);
      setReportLimitMessage('');

    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report. Please try again.');
    }
  };

  // Helper to get current Philippine time
  const getPHTimeString = (date) => {
    return date.toLocaleString('en-PH', { 
      timeZone: 'Asia/Manila',
      hour12: true,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Live clock effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const checkExportLimits = () => {
      const excelCount = parseInt(localStorage.getItem('superadmin_excel_count') || '0', 10);
      const pdfCount = parseInt(localStorage.getItem('superadmin_pdf_count') || '0', 10);
      
      setReportCount(excelCount);
      setPdfCount(pdfCount);
      setCanExportExcel(excelCount < 5);
      setCanExportPdf(pdfCount < 5);
      
      if (excelCount >= 5 && pdfCount >= 5) {
        setReportLimitMessage('You have reached the maximum of 5 exports per day for both Excel and PDF.');
      } else if (excelCount >= 5) {
        setReportLimitMessage('You have reached the maximum of 5 Excel exports per day.');
      } else if (pdfCount >= 5) {
        setReportLimitMessage('You have reached the maximum of 5 PDF exports per day.');
      } else {
        setReportLimitMessage('');
      }
    };

    checkExportLimits();
    
    // Check if it's a new day and reset counts
    const lastExportDate = localStorage.getItem('superadmin_last_export_date');
    const today = new Date().toDateString();
    
    if (lastExportDate !== today) {
      localStorage.setItem('superadmin_excel_count', '0');
      localStorage.setItem('superadmin_pdf_count', '0');
      localStorage.setItem('superadmin_last_export_date', today);
      setReportCount(0);
      setPdfCount(0);
      setCanExportExcel(true);
      setCanExportPdf(true);
      setReportLimitMessage('');
    }
  }, []);

  const handleExport = async () => {
    // Date validation for all exports
    if (!startDate || !endDate) {
      setDateError('Please select both start and end dates for the report');
      return;
    }
    if (!validateDates(startDate, endDate)) {
      return;
    }
    if (exportFilter === 'all') {
      await generateExcelReport();
      return;
    }
    // Prepare data for each filter with same formatting as 'All'
    let wb = XLSX.utils.book_new();
    let ws, fileName = '';
    // Helper functions for styling (copied from generateExcelReport)
    const createMainReportTitles = () => [
      { A: 'SANTA MARIA MUNICIPALITY' },
      { A: 'Municipal Social Welfare and Development Office (MSWDO)' },
      { A: 'SOLO PARENT ANALYTICS REPORT' }
    ];
    const createSheetHeaderDetails = (title, subtitle = '') => [
      { A: `Report Period: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}` },
      { A: `Barangay: ${selectedBrgy}` },
      { A: `Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}` },
      { A: '' },
      { A: title },
      { A: subtitle }
    ];
    const addReportHeaderStyling = (ws) => {
      ws['!cols'] = [
        { wch: 35 }, { wch: 20 }, { wch: 20 }, { wch: 20 },
        { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }
      ];
      ws['!merges'] = ws['!merges'] || [];
      ws['!merges'].push(
        { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 7 } }
      );
      for (let i = 0; i < 3; i++) {
        const cellRef = `A${i + 1}`;
        if (ws[cellRef]) {
          ws[cellRef].s = {
            font: { bold: true, sz: (i === 2) ? 20 : 14, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "16C47F" } },
            alignment: { horizontal: "center", vertical: "center" }
          };
        }
      }
      for (let i = 4; i < 10; i++) {
        ws['!merges'].push({ s: { r: i, c: 0 }, e: { r: i, c: 7 } });
        const cellRef = `A${i + 1}`;
        if (ws[cellRef]) {
          ws[cellRef].s = {
            font: { bold: (i === 8 || i === 9), sz: (i === 8 || i === 9) ? 16 : 12, color: { rgb: "000000" } },
            fill: { fgColor: { rgb: "F0F0F0" } },
            alignment: { horizontal: "center", vertical: "center" }
          };
        }
      }
    };
    const addDataTableHeaderStyling = (ws, headerRowIndex, numColumns) => {
      for (let c = 0; c < numColumns; c++) {
        const cellRef = XLSX.utils.encode_cell({ r: headerRowIndex - 1, c: c });
        if (ws[cellRef]) {
          ws[cellRef].s = {
            font: { bold: true, sz: 12, color: { rgb: "000000" } },
            fill: { fgColor: { rgb: "D9EAD3" } },
            alignment: { horizontal: "center", vertical: "center" },
            border: {
              top: { style: "thin", color: { rgb: "000000" } },
              bottom: { style: "thin", color: { rgb: "000000" } },
              left: { style: "thin", color: { rgb: "000000" } },
              right: { style: "thin", color: { rgb: "000000" } }
            }
          };
        }
      }
    };
    const addAlternatingRowColors = (ws, startRowIndex, endRowIndex, numColumns) => {
      const color1 = "FFFFFF";
      const color2 = "F2F2F2";
      for (let r = startRowIndex - 1; r < endRowIndex; r++) {
        const rowColor = (r % 2 === 0) ? color1 : color2;
        for (let c = 0; c < numColumns; c++) {
          const cellRef = XLSX.utils.encode_cell({ r: r, c: c });
          if (ws[cellRef]) {
            ws[cellRef].s = ws[cellRef].s || {};
            ws[cellRef].s.fill = { fgColor: { rgb: rowColor } };
          } else {
            ws[cellRef] = { s: { fill: { fgColor: { rgb: rowColor } } } };
          }
        }
      }
    };
    if (exportFilter === 'monthlyPopulation') {
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const data = [
        ...createMainReportTitles(),
        { A: '' },
        ...createSheetHeaderDetails('MONTHLY POPULATION ANALYSIS', 'Population Trends by Month'),
        { A: '', B: '', C: '', D: '', E: '', F: '', G: '', H: '' },
        { A: 'MONTH', B: 'POPULATION COUNT', C: 'CUMULATIVE TOTAL', D: 'MONTHLY GROWTH %' },
        ...monthNames.map((month, index) => {
          const cumulative = monthlyPopulation.datasets[0].data.slice(0, index + 1).reduce((sum, count) => sum + count, 0);
          const growth = index > 0 ? ((monthlyPopulation.datasets[0].data[index] - monthlyPopulation.datasets[0].data[index - 1]) / (monthlyPopulation.datasets[0].data[index - 1] || 1) * 100).toFixed(1) : '0.0';
          return {
            A: month,
            B: monthlyPopulation.datasets[0].data[index],
            C: cumulative,
            D: `${growth}%`
          };
        }),
        { A: '', B: '', C: '', D: '', E: '', F: '', G: '', H: '' },
        { A: 'TOTAL', B: monthlyPopulation.datasets[0].data.reduce((sum, count) => sum + count, 0), C: '', D: '' }
      ];
      ws = XLSX.utils.json_to_sheet(data);
      addReportHeaderStyling(ws);
      addDataTableHeaderStyling(ws, 12, 4);
      addAlternatingRowColors(ws, 13, 13 + monthNames.length - 1, 4);
      XLSX.utils.book_append_sheet(wb, ws, "Monthly Population");
      fileName = `MSWDO_Monthly_Population_Report_${selectedBrgy}_${startDate}_to_${endDate}.xlsx`;
    } else if (exportFilter === 'applicationStatus') {
      const totalApplications = (applicationStatusData.accepted || 0) + (applicationStatusData.pending || 0) + (applicationStatusData.declined || 0);
      const data = [
        ...createMainReportTitles(),
        { A: '' },
        ...createSheetHeaderDetails('APPLICATION STATUS ANALYSIS', 'Comprehensive Application Processing Overview'),
        { A: '', B: '', C: '', D: '', E: '' },
        { A: 'STATUS', B: 'COUNT', C: 'PERCENTAGE', D: 'PROCESSING TIME', E: 'NOTES' },
        { A: 'Accepted', B: applicationStatusData.accepted || 0, C: `${((applicationStatusData.accepted || 0) / totalApplications * 100).toFixed(1)}%`, D: '15-30 days', E: 'Successfully processed applications' },
        { A: 'Pending', B: applicationStatusData.pending || 0, C: `${((applicationStatusData.pending || 0) / totalApplications * 100).toFixed(1)}%`, D: 'Under review', E: 'Applications awaiting review or additional documents' },
        { A: 'Declined', B: applicationStatusData.declined || 0, C: `${((applicationStatusData.declined || 0) / totalApplications * 100).toFixed(1)}%`, D: 'N/A', E: 'Applications that did not meet requirements' },
        { A: '', B: '', C: '', D: '', E: '', F: '', G: '', H: '' },
        { A: 'TOTAL APPLICATIONS', B: totalApplications, C: '100%', D: '', E: '' },
        { A: '', B: '', C: '', D: '', E: '', F: '', G: '', H: '' },
        { A: 'PERFORMANCE METRICS:', B: '', C: '', D: '', E: '' },
        { A: '• Acceptance Rate', B: `${((applicationStatusData.accepted || 0) / totalApplications * 100).toFixed(1)}%`, C: '', D: '', E: 'Percentage of successful applications' },
        { A: '• Processing Efficiency', B: `${((applicationStatusData.accepted || 0) / ((applicationStatusData.accepted || 0) + (applicationStatusData.pending || 0)) * 100).toFixed(1)}%`, C: '', D: '', E: 'Efficiency of application processing' }
      ];
      ws = XLSX.utils.json_to_sheet(data);
      addReportHeaderStyling(ws);
      addDataTableHeaderStyling(ws, 12, 5);
      addAlternatingRowColors(ws, 13, 15, 5);
      XLSX.utils.book_append_sheet(wb, ws, "Application Status");
      fileName = `MSWDO_Application_Status_Report_${selectedBrgy}_${startDate}_to_${endDate}.xlsx`;
    } else if (exportFilter === 'beneficiaryStatus') {
      const total = beneficiariesData.beneficiaries + beneficiariesData.nonBeneficiaries;
      const data = [
        ...createMainReportTitles(),
        { A: '' },
        ...createSheetHeaderDetails('BENEFICIARIES ANALYSIS', 'Detailed Breakdown of Beneficiary Status'),
        { A: '', B: '', C: '', D: '', E: '', F: '', G: '', H: '' },
        { A: 'CATEGORY', B: 'COUNT', C: 'PERCENTAGE', D: 'DESCRIPTION' },
        { A: 'Beneficiaries', B: beneficiariesData.beneficiaries, C: `${(beneficiariesData.beneficiaries / total * 100).toFixed(1)}%`, D: 'Solo parents currently receiving government benefits' },
        { A: 'Non-Beneficiaries', B: beneficiariesData.nonBeneficiaries, C: `${(beneficiariesData.nonBeneficiaries / total * 100).toFixed(1)}%`, D: 'Solo parents not receiving benefits' },
        { A: '', B: '', C: '', D: '', E: '', F: '', G: '', H: '' },
        { A: 'TOTAL', B: total, C: '100%', D: 'Total registered solo parents' },
        { A: '', B: '', C: '', D: '', E: '', F: '', G: '', H: '' },
        { A: 'ANALYSIS NOTES:', B: '', C: '', D: '' },
        { A: '• Beneficiary Rate', B: `${(beneficiariesData.beneficiaries / total * 100).toFixed(1)}%`, C: '', D: 'Percentage of solo parents receiving benefits' },
        { A: '• Coverage Gap', B: `${(beneficiariesData.nonBeneficiaries / total * 100).toFixed(1)}%`, C: '', D: 'Percentage not yet receiving benefits' }
      ];
      ws = XLSX.utils.json_to_sheet(data);
      addReportHeaderStyling(ws);
      addDataTableHeaderStyling(ws, 12, 4);
      addAlternatingRowColors(ws, 13, 14, 4);
      XLSX.utils.book_append_sheet(wb, ws, "Beneficiaries Analysis");
      fileName = `MSWDO_Beneficiary_Status_Report_${selectedBrgy}_${startDate}_to_${endDate}.xlsx`;
    } else if (exportFilter === 'childrenAge') {
      const total = Object.values(childrenAgeData.ageGroups).reduce((sum, count) => sum + count, 0);
      const data = [
        ...createMainReportTitles(),
        { A: '' },
        ...createSheetHeaderDetails('CHILDREN AGE DISTRIBUTION', 'Distribution of Children by Age Group'),
        { A: '', B: '', C: '', D: '' },
        { A: 'Age Group', B: 'Count', C: 'Percentage', D: 'Description' },
        { A: '0-5 years', B: childrenAgeData.ageGroups['0-5'], C: `${(childrenAgeData.ageGroups['0-5'] / total * 100).toFixed(1)}%`, D: 'Preschool age children' },
        { A: '6-12 years', B: childrenAgeData.ageGroups['6-12'], C: `${(childrenAgeData.ageGroups['6-12'] / total * 100).toFixed(1)}%`, D: 'Elementary school age children' },
        { A: '13-17 years', B: childrenAgeData.ageGroups['13-17'], C: `${(childrenAgeData.ageGroups['13-17'] / total * 100).toFixed(1)}%`, D: 'High school age children' },
        { A: '18-21 years', B: childrenAgeData.ageGroups['18-21'], C: `${(childrenAgeData.ageGroups['18-21'] / total * 100).toFixed(1)}%`, D: 'Young adult children' },
        { A: '22+ years', B: childrenAgeData.ageGroups['22+'], C: `${(childrenAgeData.ageGroups['22+'] / total * 100).toFixed(1)}%`, D: 'Adult children' }
      ];
      ws = XLSX.utils.json_to_sheet(data);
      addReportHeaderStyling(ws);
      addDataTableHeaderStyling(ws, 12, 4);
      addAlternatingRowColors(ws, 13, 17, 4);
      XLSX.utils.book_append_sheet(wb, ws, "Children Age Distribution");
      fileName = `MSWDO_Children_Age_Distribution_Report_${selectedBrgy}_${startDate}_to_${endDate}.xlsx`;
    } else if (exportFilter === 'childrenCount') {
      const total = childrenCountData.childrenCountDistribution.reduce((sum, item) => sum + item.frequency, 0);
      const data = [
        ...createMainReportTitles(),
        { A: '' },
        ...createSheetHeaderDetails('NUMBER OF CHILDREN', 'Distribution of Number of Children per Solo Parent'),
        { A: '', B: '', C: '', D: '' },
        { A: 'Children Count', B: 'Frequency', C: 'Percentage', D: 'Description' },
        ...childrenCountData.childrenCountDistribution.map(item => ({
          A: item.count,
          B: item.frequency,
          C: total ? `${(item.frequency / total * 100).toFixed(1)}%` : '0%',
          D: `Solo parents with ${item.count} children`
        }))
      ];
      ws = XLSX.utils.json_to_sheet(data);
      addReportHeaderStyling(ws);
      addDataTableHeaderStyling(ws, 12, 4);
      addAlternatingRowColors(ws, 13, 13 + childrenCountData.childrenCountDistribution.length - 1, 4);
      XLSX.utils.book_append_sheet(wb, ws, "Number of Children");
      fileName = `MSWDO_Number_of_Children_Report_${selectedBrgy}_${startDate}_to_${endDate}.xlsx`;
    } else if (exportFilter === 'ageOfSoloParents') {
      const total = ageData.ageDistribution.reduce((sum, item) => sum + item.count, 0);
      const data = [
        ...createMainReportTitles(),
        { A: '' },
        ...createSheetHeaderDetails('AGE OF SOLO PARENTS', 'Distribution of Solo Parents by Age'),
        { A: '', B: '', C: '', D: '' },
        { A: 'Age', B: 'Count', C: 'Percentage', D: 'Description' },
        ...ageData.ageDistribution.map(item => ({
          A: item.age,
          B: item.count,
          C: total ? `${(item.count / total * 100).toFixed(1)}%` : '0%',
          D: `${item.age} years old`
        }))
      ];
      ws = XLSX.utils.json_to_sheet(data);
      addReportHeaderStyling(ws);
      addDataTableHeaderStyling(ws, 12, 4);
      addAlternatingRowColors(ws, 13, 13 + ageData.ageDistribution.length - 1, 4);
      XLSX.utils.book_append_sheet(wb, ws, "Age of Solo Parents");
      fileName = `MSWDO_Age_of_Solo_Parents_Report_${selectedBrgy}_${startDate}_to_${endDate}.xlsx`;
    }
    XLSX.writeFile(wb, fileName);
    setSuccessMessage('Generated Success');
    setShowSuccessModal(true);
    setTimeout(() => setShowSuccessModal(false), 2000);
    
    // Update Excel count in localStorage
    const newExcelCount = reportCount + 1;
    localStorage.setItem('superadmin_excel_count', newExcelCount.toString());
    setReportCount(newExcelCount);
    
    if (newExcelCount >= 5) {
      setCanExportExcel(false);
      setReportLimitMessage('You have reached the maximum of 5 Excel exports per day.');
    }
  };

  // Add date validation function
  const validateDates = (start, end) => {
    // Clear previous error
    setDateError("");

    // Get current year
    const currentYear = new Date().getFullYear();

    if (start && end) {
      const startDate = new Date(start);
      const endDate = new Date(end);
      // Check if either date's year is in the future
      if (startDate.getFullYear() > currentYear || endDate.getFullYear() > currentYear) {
        setDateError("Cannot select future years");
        return false;
      }
      // Check if end date is before start date
      if (endDate < startDate) {
        setDateError("End date cannot be earlier than start date");
        return false;
      }
    }
    return true;
  };

  // Update the date change handlers
  const handleStartDateChange = (e) => {
    const newStartDate = e.target.value;
    if (validateDates(newStartDate, endDate)) {
      setStartDate(newStartDate);
    }
  };

  const handleEndDateChange = (e) => {
    const newEndDate = e.target.value;
    if (validateDates(startDate, newEndDate)) {
      setEndDate(newEndDate);
    }
  };

  // Function to get max date allowed (last day of current year)
  const getMaxDateForInput = () => {
    const currentYear = new Date().getFullYear();
    return `${currentYear}-12-31`;
  };

  // PDF Export Function
  const handleExportPdf = async () => {
    // Check PDF export limit
    if (!canExportPdf) {
      setReportLimitMessage('You have reached the maximum of 5 PDF exports per day.');
      return;
    }
    
    // Date validation
    if (!startDate || !endDate) {
      setDateError('Please select both start and end dates for the report');
      return;
    }
    if (!validateDates(startDate, endDate)) {
      return;
    }

    try {
      // Generate PDF using jsPDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      let yPosition = margin;

      // Add logo to header
      try {
        const logoImg = new Image();
        logoImg.src = '/logo.jpg';
        await new Promise((resolve, reject) => {
          logoImg.onload = resolve;
          logoImg.onerror = reject;
        });
        
        // Add logo on the left side (much smaller size)
        pdf.addImage(logoImg, 'JPEG', margin, yPosition, 15, 15);
        
        // Header text positioned to avoid logo overlap (moved to right)
        pdf.setFontSize(14);
        pdf.setFont(undefined, 'bold');
        pdf.setTextColor(0, 0, 0); // Black
        pdf.text('SANTA MARIA MUNICIPALITY', margin + 25, yPosition + 5);
        pdf.text('Municipal Social Welfare and Development Office (MSWDO)', margin + 25, yPosition + 11);
        pdf.text('SOLO PARENT ANALYTICS REPORT', margin + 25, yPosition + 17);
        yPosition += 25;
      } catch (error) {
        console.log('Logo not found, using text-only header');
        // Fallback to text-only header
        pdf.setFontSize(14);
        pdf.setFont(undefined, 'bold');
        pdf.setTextColor(0, 0, 0); // Black
        pdf.text('SANTA MARIA MUNICIPALITY', pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 6;
        pdf.text('Municipal Social Welfare and Development Office (MSWDO)', pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 6;
        pdf.text('SOLO PARENT ANALYTICS REPORT', pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 8;
      }

      // Report details
      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`Report Period: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 6;
      pdf.text(`Barangay: ${selectedBrgy}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 6;
      pdf.text(`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // Add horizontal line below header
      pdf.setDrawColor(0, 0, 0); // Black line
      pdf.setLineWidth(0.5);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;

      // Helper function to create tables
      const createTable = (headers, data, startY) => {
        const tableWidth = pageWidth - (2 * margin);
        const colWidth = tableWidth / headers.length;
        const rowHeight = 8;
        let currentY = startY;
        
        // Draw header
        pdf.setFillColor(217, 234, 211); // Light green background
        pdf.rect(margin, currentY, tableWidth, rowHeight, 'F');
        pdf.setFontSize(10);
        pdf.setFont(undefined, 'bold');
        pdf.setTextColor(0, 0, 0);
        
        headers.forEach((header, index) => {
          const x = margin + (index * colWidth);
          pdf.text(header, x + 2, currentY + 5);
        });
        currentY += rowHeight;
        
        // Draw data rows
        pdf.setFont(undefined, 'normal');
        data.forEach((row, rowIndex) => {
          // Alternate row colors
          if (rowIndex % 2 === 0) {
            pdf.setFillColor(255, 255, 255); // White
          } else {
            pdf.setFillColor(242, 242, 242); // Light gray
          }
          pdf.rect(margin, currentY, tableWidth, rowHeight, 'F');
          
          row.forEach((cell, cellIndex) => {
            const x = margin + (cellIndex * colWidth);
            pdf.text(cell, x + 2, currentY + 5);
          });
          currentY += rowHeight;
        });
        
        return currentY;
      };

      // Helper function to add section with table
      const addSectionWithTable = (title, headers, data) => {
        if (yPosition > pageHeight - 60) {
          pdf.addPage();
          yPosition = margin;
        }
        
        pdf.setFontSize(12);
        pdf.setFont(undefined, 'bold');
        pdf.text(title, margin, yPosition);
        yPosition += 8;
        
        yPosition = createTable(headers, data, yPosition);
        yPosition += 10;
      };

      // Generate content based on filter selection
      if (exportFilter === 'monthlyPopulation') {
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const monthlyData = monthNames.map((month, index) => [
          month,
          monthlyPopulation.datasets[0].data[index].toString(),
          monthlyPopulation.datasets[0].data.slice(0, index + 1).reduce((sum, count) => sum + count, 0).toString()
        ]);
        addSectionWithTable('Monthly Population Analysis', 
          ['Month', 'Population Count', 'Cumulative Total'],
          monthlyData
        );
      } else if (exportFilter === 'applicationStatus') {
        const totalApplications = (applicationStatusData.accepted || 0) + (applicationStatusData.pending || 0) + (applicationStatusData.declined || 0);
        const applicationTableData = [
          ['Accepted', (applicationStatusData.accepted || 0).toString(), `${((applicationStatusData.accepted || 0) / totalApplications * 100).toFixed(1)}%`],
          ['Pending', (applicationStatusData.pending || 0).toString(), `${((applicationStatusData.pending || 0) / totalApplications * 100).toFixed(1)}%`],
          ['Declined', (applicationStatusData.declined || 0).toString(), `${((applicationStatusData.declined || 0) / totalApplications * 100).toFixed(1)}%`]
        ];
        addSectionWithTable('Application Status Analysis', 
          ['Status', 'Count', 'Percentage'],
          applicationTableData
        );
      } else if (exportFilter === 'beneficiaryStatus') {
        const total = beneficiariesData.beneficiaries + beneficiariesData.nonBeneficiaries;
        const beneficiaryTableData = [
          ['Beneficiaries', beneficiariesData.beneficiaries.toString(), `${(beneficiariesData.beneficiaries / total * 100).toFixed(1)}%`],
          ['Non-Beneficiaries', beneficiariesData.nonBeneficiaries.toString(), `${(beneficiariesData.nonBeneficiaries / total * 100).toFixed(1)}%`]
        ];
        addSectionWithTable('Beneficiary Status Analysis', 
          ['Category', 'Count', 'Percentage'],
          beneficiaryTableData
        );
      } else if (exportFilter === 'childrenAge') {
        const total = Object.values(childrenAgeData.ageGroups).reduce((sum, count) => sum + count, 0);
        const childrenAgeTableData = Object.entries(childrenAgeData.ageGroups).map(([label, value]) => [
          label,
          value.toString(),
          `${(value / total * 100).toFixed(1)}%`
        ]);
        addSectionWithTable('Children Age Distribution', 
          ['Age Group', 'Count', 'Percentage'],
          childrenAgeTableData
        );
      } else if (exportFilter === 'childrenCount') {
        const total = childrenCountData.childrenCountDistribution.reduce((sum, item) => sum + item.frequency, 0);
        const childrenCountTableData = childrenCountData.childrenCountDistribution.map(item => [
          item.count,
          item.frequency.toString(),
          total ? `${(item.frequency / total * 100).toFixed(1)}%` : '0%'
        ]);
        addSectionWithTable('Number of Children', 
          ['Children Count', 'Families', 'Percentage'],
          childrenCountTableData
        );
      } else if (exportFilter === 'ageOfSoloParents') {
        const total = ageData.ageDistribution.reduce((sum, item) => sum + item.count, 0);
        const ageTableData = ageData.ageDistribution.map(item => [
          item.age,
          item.count.toString(),
          total ? `${(item.count / total * 100).toFixed(1)}%` : '0%'
        ]);
        addSectionWithTable('Age of Solo Parents', 
          ['Age', 'Count', 'Percentage'],
          ageTableData
        );
      } else {
        // Default: Executive Summary (when 'all' is selected)
        const totalPopulation = monthlyPopulation.datasets[0].data.reduce((sum, val) => sum + val, 0);
        const totalApplications = (applicationStatusData.accepted || 0) + (applicationStatusData.pending || 0) + (applicationStatusData.declined || 0);
        const totalBeneficiaries = beneficiariesData.beneficiaries + beneficiariesData.nonBeneficiaries;
        
        addSectionWithTable('Executive Summary', 
          ['Metric', 'Value', 'Percentage', 'Notes'],
          [
            ['Total Population', totalPopulation.toString(), '100%', 'All registered solo parents'],
            ['Total Applications', totalApplications.toString(), '100%', 'All applications processed'],
            ['Total Beneficiaries', totalBeneficiaries.toString(), '100%', 'All beneficiaries']
          ]
        );

        // Monthly Population
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const monthlyData = monthNames.map((month, index) => {
          const count = monthlyPopulation.datasets[0].data[index];
          const cumulative = monthlyPopulation.datasets[0].data.slice(0, index + 1).reduce((sum, val) => sum + val, 0);
          
          // Calculate growth percentage with proper error handling
          let growth = '0.0%';
          if (index > 0) {
            const previousCount = monthlyPopulation.datasets[0].data[index - 1];
            if (previousCount > 0) {
              const growthValue = ((count - previousCount) / previousCount * 100);
              growth = `${growthValue.toFixed(1)}%`;
            } else if (count > 0) {
              growth = 'New'; // When previous was 0 but current has data
            } else {
              growth = '0.0%'; // Both previous and current are 0
            }
          }
          
          return [
            month,
            count.toString(),
            cumulative.toString(),
            growth
          ];
        });
        
        // Add total row
        const monthlyTotalPopulation = monthlyPopulation.datasets[0].data.reduce((sum, val) => sum + val, 0);
        monthlyData.push(['TOTAL', monthlyTotalPopulation.toString(), '', '']);
        
        addSectionWithTable('Monthly Population Analysis', 
          ['Month', 'Population Count', 'Cumulative Total', 'Monthly Growth %'],
          monthlyData
        );

        // Application Status
        const applicationTableData = [
          ['Accepted', (applicationStatusData.accepted || 0).toString(), `${((applicationStatusData.accepted || 0) / totalApplications * 100).toFixed(1)}%`],
          ['Pending', (applicationStatusData.pending || 0).toString(), `${((applicationStatusData.pending || 0) / totalApplications * 100).toFixed(1)}%`],
          ['Declined', (applicationStatusData.declined || 0).toString(), `${((applicationStatusData.declined || 0) / totalApplications * 100).toFixed(1)}%`]
        ];
        addSectionWithTable('Application Status Analysis', 
          ['Status', 'Count', 'Percentage'],
          applicationTableData
        );

        // Beneficiary Status
        const beneficiaryTableData = [
          ['Beneficiaries', beneficiariesData.beneficiaries.toString(), `${(beneficiariesData.beneficiaries / totalBeneficiaries * 100).toFixed(1)}%`],
          ['Non-Beneficiaries', beneficiariesData.nonBeneficiaries.toString(), `${(beneficiariesData.nonBeneficiaries / totalBeneficiaries * 100).toFixed(1)}%`]
        ];
        addSectionWithTable('Beneficiary Status Analysis', 
          ['Category', 'Count', 'Percentage'],
          beneficiaryTableData
        );
      }

      // Footer
      if (yPosition > pageHeight - 30) {
        pdf.addPage();
        yPosition = margin;
      }
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text('This is a system-generated report.', pageWidth / 2, yPosition, { align: 'center' });

      // Save the PDF
      const fileName = `MSWDO_Solo_Parent_Report_${selectedBrgy}_${startDate}_to_${endDate}.pdf`;
      pdf.save(fileName);

      // Show success message
      setSuccessMessage('PDF Generated Successfully');
      setShowSuccessModal(true);
      setTimeout(() => setShowSuccessModal(false), 2000);

      // Update PDF count in localStorage
      const newPdfCount = pdfCount + 1;
      localStorage.setItem('superadmin_pdf_count', newPdfCount.toString());
      setPdfCount(newPdfCount);
      
      if (newPdfCount >= 5) {
        setCanExportPdf(false);
        setReportLimitMessage('You have reached the maximum of 5 PDF exports per day.');
      }

    } catch (error) {
      console.error('Error generating PDF report:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  return (
    <Box sx={{ p: { xs: 0.5, sm: 3 } }}>
      <div className="superadmin-dashboard">
        <div className="superadmin-dashboard-header">
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 2, mb: 2 }}>
            {/* Dashboard Title */}
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                color: '#16C47F',
                fontSize: { xs: '2rem', sm: '2.5rem' },
                textAlign: { xs: 'center', sm: 'left' },
                width: '100%'
              }}
            >
              Dashboard
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
              <FormControl sx={{ minWidth: 180 }} size="small">
                <InputLabel id="superadmin-barangay-select-label">Barangay</InputLabel>
                <Select
                  labelId="superadmin-barangay-select-label"
                  id="superadmin-barangay-select"
                  value={selectedBrgy}
                  label="Barangay"
                  onChange={(e) => setSelectedBrgy(e.target.value)}
                >
                  {barangays.map((brgy) => (
                    <MenuItem key={brgy} value={brgy}>{brgy}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                id="start-date"
                label="Start Date"
                type="date"
                size="small"
                value={startDate}
                onChange={handleStartDateChange}
                InputLabelProps={{ shrink: true }}
                inputProps={{ max: getMaxDateForInput() }}
                sx={{ minWidth: 150 }}
              />
              <TextField
                id="end-date"
                label="End Date"
                type="date"
                size="small"
                value={endDate}
                onChange={handleEndDateChange}
                InputLabelProps={{ shrink: true }}
                inputProps={{ max: getMaxDateForInput() }}
                sx={{ minWidth: 150 }}
              />
              <FormControl sx={{ minWidth: 180 }} size="small">
                <InputLabel id="export-filter-label">Export</InputLabel>
                <Select
                  labelId="export-filter-label"
                  id="export-filter"
                  value={exportFilter}
                  label="Export"
                  onChange={e => setExportFilter(e.target.value)}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="monthlyPopulation">Monthly Population</MenuItem>
                  <MenuItem value="applicationStatus">Application Status</MenuItem>
                  <MenuItem value="beneficiaryStatus">Beneficiary Status</MenuItem>
                  <MenuItem value="childrenAge">Children Age Distribution</MenuItem>
                  <MenuItem value="childrenCount">Number of Children</MenuItem>
                  <MenuItem value="ageOfSoloParents">Age of Solo Parents</MenuItem>
                </Select>
              </FormControl>
              <Button
                variant="contained"
                color="success"
                startIcon={<i className="fas fa-file-excel"></i>}
                onClick={handleExport}
                sx={{ height: 40, minWidth: 160, fontWeight: 'bold', fontSize: 16 }}
                disabled={!canExportExcel}
              >
                Export Report
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<i className="fas fa-file-pdf"></i>}
                onClick={handleExportPdf}
                sx={{ height: 40, minWidth: 160, fontWeight: 'bold', fontSize: 16 }}
                disabled={!canExportPdf}
              >
                Export PDF
              </Button>
              <Typography
                variant="caption"
                sx={{
                  color: (canExportExcel && canExportPdf) ? '#16C47F' : '#E74C3C',
                  fontWeight: 'bold',
                  fontSize: '0.75rem'
                }}
              >
                Excel: {reportCount}/5 | PDF: {pdfCount}/5
              </Typography>
              {reportLimitMessage && <Alert severity="warning">{reportLimitMessage}</Alert>}
            </Box>
            {dateError && <Alert severity="error">{dateError}</Alert>}
          </Box>
        </div>

        <div className="superadmin-charts-grid dashboard-charts-grid">
          <div className="dashboard-chart-box">
            <Paper elevation={3} sx={{ p: 2, mb: 2, mt: 3 }}>
              <Typography variant="h6" mb={1}>Monthly Population Trend</Typography>
              <ReactECharts 
                ref={(e) => { chartsRef.current[0] = e; }}
                option={populationOption}
                style={{ height: '350px', width: '100%' }}
              />
            </Paper>
          </div>
          <div className="dashboard-chart-box">
            <Paper elevation={3} sx={{ p: 2, mb: 2, mt: 3 }}>
              <Typography variant="h6" mb={1}>Application Status</Typography>
              <ReactECharts 
                ref={(e) => { chartsRef.current[1] = e; }}
                option={ageDistributionOption}
                style={{ height: '350px', width: '100%' }}
              />
            </Paper>
          </div>
          <div className="dashboard-chart-box">
            <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6" mb={1}>Beneficiary Status</Typography>
              <ReactECharts 
                ref={(e) => { chartsRef.current[2] = e; }}
                option={employmentOption}
                style={{ height: '300px', width: '100%' }}
              />
            </Paper>
          </div>
          <div className="dashboard-chart-box">
            <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6" mb={1}>Age of Solo Parents</Typography>
              <ReactECharts 
                ref={(e) => { chartsRef.current[3] = e; }}
                option={getAgeChartOptions()}
                style={{ height: '300px', width: '100%' }}
              />
            </Paper>
          </div>
          <div className="dashboard-chart-box">
            <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6" mb={1}>Number of Children</Typography>
              <ReactECharts 
                ref={(e) => { chartsRef.current[4] = e; }}
                option={getChildrenCountChartOptions()}
                style={{ height: '300px', width: '100%' }}
              />
            </Paper>
          </div>
          <div className="dashboard-chart-box">
            <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6" mb={1}>Children Age Distribution</Typography>
              <ReactECharts 
                ref={(e) => { chartsRef.current[5] = e; }}
                option={childrenAgeOption}
                style={{ height: '300px', width: '100%' }}
              />
            </Paper>
          </div>
        </div>

        <div className="superadmin-data-table-container">
          <h2>Accepted Users</h2>
          {error && (
            <Alert severity="error">{error}</Alert>
          )}
          <Paper sx={{ width: '100%', overflow: 'auto', mt: 2, p: 2 }}>
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
                <CircularProgress />
              </Box>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15, background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px #eee' }}>
                <thead>
                  <tr style={{ background: '#16C47F', color: '#fff' }}>
                    <th style={{ padding: '10px 8px', fontWeight: 'bold' }}>#</th>
                    <th style={{ padding: '10px 8px', fontWeight: 'bold' }}>Name</th>
                    <th style={{ padding: '10px 8px', fontWeight: 'bold' }}>Accepted At</th>
                  </tr>
                </thead>
                <tbody>
                  {acceptedUsers.map((user, index) => (
                    <tr key={`${user.name}-${user.accepted_at}-${index}`} style={{ background: index % 2 === 0 ? '#f9f9f9' : '#fff' }}>
                      <td style={{ padding: '8px', textAlign: 'center' }}>{index + 1}</td>
                      <td style={{ padding: '8px' }}><strong>{user.name}</strong></td>
                      <td style={{ padding: '8px' }}>{new Date(user.accepted_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Paper>
        </div>

      </div>
      {showSuccessModal && (
        <div className="soloparent-modal-overlay">
          <div className="soloparent-success-modal">
            <div className="soloparent-success-content">
              <CheckCircleIcon style={{ fontSize: '4rem', color: '#10b981', animation: 'pulse 1.5s infinite' }} />
              <p style={{ fontSize: '1.25rem', color: '#1e293b', margin: 0, fontWeight: 500 }}>{successMessage}</p>
            </div>
          </div>
        </div>
      )}
    </Box>
  );
};

export default SDashboard;