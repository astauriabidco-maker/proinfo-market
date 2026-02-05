/**
 * AssetDetails Component
 * Affiche les détails complets d'un asset
 */

import { Asset, Availability } from '@/services/api';

interface AssetDetailsProps {
    asset: Asset;
    availability?: Availability;
}

export default function AssetDetails({ asset, availability }: AssetDetailsProps) {
    const isAvailable = availability?.available ?? false;

    return (
        <div style={{
            backgroundColor: '#fff',
            borderRadius: '8px',
            padding: '24px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
            <div style={{ marginBottom: '24px' }}>
                <span style={{
                    backgroundColor: isAvailable ? '#22c55e' : '#ef4444',
                    color: '#fff',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    fontSize: '14px'
                }}>
                    {isAvailable ? 'Disponible' : 'Indisponible'}
                </span>
            </div>

            <h1 style={{ margin: '0 0 16px 0', fontSize: '28px' }}>
                {asset.brand} {asset.model}
            </h1>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                    <tr style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '12px 0', fontWeight: 'bold', width: '200px' }}>Numéro de série</td>
                        <td style={{ padding: '12px 0' }}>{asset.serialNumber}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '12px 0', fontWeight: 'bold' }}>Type</td>
                        <td style={{ padding: '12px 0' }}>{asset.assetType}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '12px 0', fontWeight: 'bold' }}>Marque</td>
                        <td style={{ padding: '12px 0' }}>{asset.brand}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '12px 0', fontWeight: 'bold' }}>Modèle</td>
                        <td style={{ padding: '12px 0' }}>{asset.model}</td>
                    </tr>
                    {asset.chassisRef && (
                        <tr style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '12px 0', fontWeight: 'bold' }}>Châssis</td>
                            <td style={{ padding: '12px 0' }}>{asset.chassisRef}</td>
                        </tr>
                    )}
                    {asset.grade && (
                        <tr style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '12px 0', fontWeight: 'bold' }}>Grade</td>
                            <td style={{ padding: '12px 0' }}>{asset.grade}</td>
                        </tr>
                    )}
                    <tr style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '12px 0', fontWeight: 'bold' }}>Statut</td>
                        <td style={{ padding: '12px 0' }}>{asset.status}</td>
                    </tr>
                    {availability?.location && (
                        <tr style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '12px 0', fontWeight: 'bold' }}>Emplacement</td>
                            <td style={{ padding: '12px 0' }}>{availability.location}</td>
                        </tr>
                    )}
                    <tr style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '12px 0', fontWeight: 'bold' }}>Réservé</td>
                        <td style={{ padding: '12px 0' }}>{availability?.reserved ? 'Oui' : 'Non'}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}
