import React from 'react';
import { Chip } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import KeyboardDoubleArrowUpIcon from '@mui/icons-material/KeyboardDoubleArrowUp';
import KeyboardDoubleArrowDownIcon from '@mui/icons-material/KeyboardDoubleArrowDown';
import { calculateTrend } from '../../utils/trend';

interface TrendBadgeProps {
  scores: number[];
}

export const TrendBadge: React.FC<TrendBadgeProps> = ({ scores }) => {
  const trend = calculateTrend(scores);

  const getIcon = () => {
    switch (trend.level) {
      case 'strongly_increasing':
        return <KeyboardDoubleArrowUpIcon />;
      case 'increasing':
        return <TrendingUpIcon />;
      case 'stable':
        return <TrendingFlatIcon />;
      case 'decreasing':
        return <TrendingDownIcon />;
      case 'strongly_decreasing':
        return <KeyboardDoubleArrowDownIcon />;
    }
  };

  return (
    <Chip
      icon={getIcon()}
      label={`${trend.label} (${trend.percentageChange > 0 ? '+' : ''}${trend.percentageChange}%)`}
      color={trend.color}
      size="small"
      variant="outlined"
      className="font-medium"
    />
  );
};