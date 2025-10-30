import h5py
import json
import sys

MODEL_FILE = 'my_trained_model1.h5'

def print_attrs(name, obj):
    print(name)

try:
    f = h5py.File(MODEL_FILE, 'r')
except Exception as e:
    print(f'Failed to open {MODEL_FILE}:', e)
    sys.exit(1)

print('\nTop-level groups:')
for k in f.keys():
    print('-', k)

# Check for model config
if 'model_config' in f.attrs:
    print('\nFound model_config in file attrs:')
    try:
        cfg = json.loads(f.attrs['model_config'].decode('utf-8')) if isinstance(f.attrs['model_config'], bytes) else json.loads(f.attrs['model_config'])
        print(json.dumps(cfg, indent=2)[:1000])
    except Exception as e:
        print('Could not parse model_config:', e)

# Print model_weights structure
if 'model_weights' in f:
    print('\nmodel_weights groups:')
    for layer_name in f['model_weights'].keys():
        print('-', layer_name)
        try:
            g = f['model_weights'][layer_name]
            for weight_name in g.keys():
                dset = g[weight_name]
                print('   -', weight_name, 'shape:', dset.shape)
        except Exception as e:
            print('   Failed to read weights for', layer_name, e)
else:
    print('\nNo model_weights group found')

# Print layer_names if present
if 'layer_names' in f.attrs:
    try:
        layer_names = [n.decode('utf-8') if isinstance(n, bytes) else n for n in f.attrs['layer_names']]
        print('\nlayer_names attr:')
        for ln in layer_names:
            print('-', ln)
    except Exception as e:
        print('Could not read layer_names attr:', e)

# If there is a signature for saving only weights, print keys
print('\nOther groups:')
for k in f.keys():
    if k not in ['model_weights']:
        print('-', k)

f.close()
print('\nDone')
