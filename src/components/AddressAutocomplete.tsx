'use client';

import { LocationOn } from '@mui/icons-material';
import { 
  TextField, 
  Autocomplete, 
  Box, 
  Typography,
  CircularProgress 
} from '@mui/material';
import { useState, useEffect } from 'react';
import { useDebounce } from 'use-debounce';

import { brandColors } from '@/theme/brandTokens';

interface AddressOption {
  label: string;
  value: string;
  place_id?: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
}

interface ParsedAddress {
  place_id: string;
  formatted_address: string;
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  latitude: number;
  longitude: number;
}

interface AddressAutocompleteProps {
  value?: string;
  onChange: (value: string | null, parsedAddress?: ParsedAddress) => void;
  error?: boolean;
  helperText?: string | undefined;
  placeholder?: string;
}

export function AddressAutocomplete({
  value = '',
  onChange,
  error,
  helperText,
  placeholder = '123 Main Street, City, State'
}: AddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [options, setOptions] = useState<AddressOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [debouncedValue] = useDebounce(inputValue, 300);

  // Google Places API autocomplete
  const searchAddresses = async (query: string): Promise<AddressOption[]> => {
    if (!query || query.length < 3) return [];
    
    try {
      const response = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(query)}`);
      if (!response.ok) {
        console.error('Failed to fetch address suggestions');
        return [];
      }
      
      const data = await response.json();
      
      return data.predictions.map((prediction: any) => ({
        label: prediction.description,
        value: prediction.description,
        place_id: prediction.place_id,
        structured_formatting: prediction.structured_formatting,
      }));
    } catch (error) {
      console.error('Address search error:', error);
      return [];
    }
  };

  useEffect(() => {
    if (debouncedValue && debouncedValue.length >= 3) {
      setLoading(true);
      searchAddresses(debouncedValue)
        .then(results => {
          setOptions(results);
        })
        .catch(error => {
          console.error('Address search error:', error);
          setOptions([]);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setOptions([]);
      setLoading(false);
    }
  }, [debouncedValue]);

  return (
    <Autocomplete
      freeSolo
      options={options}
      getOptionLabel={(option) => 
        typeof option === 'string' ? option : option.label
      }
      value={value}
      inputValue={inputValue}
      onInputChange={(_, newInputValue) => {
        setInputValue(newInputValue);
      }}
      onChange={async (_, newValue) => {
        const selectedValue = typeof newValue === 'string' 
          ? newValue 
          : newValue?.value || '';
        
        // If a place was selected (not just typed), get detailed address info
        if (newValue && typeof newValue === 'object' && newValue.place_id) {
          try {
            const response = await fetch(`/api/places/details?place_id=${newValue.place_id}`);
            if (response.ok) {
              const parsedAddress = await response.json();
              onChange(selectedValue, parsedAddress);
            } else {
              onChange(selectedValue);
            }
          } catch (error) {
            console.error('Failed to get place details:', error);
            onChange(selectedValue);
          }
        } else {
          onChange(selectedValue);
        }
        
        setInputValue(selectedValue);
      }}
      loading={loading}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Address"
          placeholder={placeholder}
          error={error || false}
          helperText={helperText || 'Your address helps us connect you with nearby neighbors'}
          fullWidth
          variant="outlined"
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <LocationOn
                sx={{ color: brandColors.charcoal, mr: 1, opacity: 0.6 }}
              />
            ),
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '12px',
              backgroundColor: brandColors.white,
              '&:hover': {
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: brandColors.inkBlue,
                },
              },
              '&.Mui-focused': {
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: brandColors.inkBlue,
                  borderWidth: 2,
                },
              },
            },
            '& .MuiInputLabel-root': {
              '&.Mui-focused': {
                color: brandColors.inkBlue,
              },
            },
          }}
        />
      )}
      renderOption={(props, option) => {
        const { key, ...otherProps } = props;
        return (
          <Box
            component="li"
            key={key}
            {...otherProps}
            sx={{
              '&:hover': {
                backgroundColor: `${brandColors.inkBlue}10`,
              },
            }}
          >
          <LocationOn
            sx={{ 
              color: brandColors.inkBlue, 
              mr: 2, 
              opacity: 0.7,
              fontSize: 20 
            }}
          />
          <Typography variant="body2" color="text.primary">
            {option.label}
          </Typography>
        </Box>
        );
      }}
      noOptionsText={
        inputValue.length < 3 
          ? "Type at least 3 characters to search addresses"
          : "No addresses found"
      }
    />
  );
}